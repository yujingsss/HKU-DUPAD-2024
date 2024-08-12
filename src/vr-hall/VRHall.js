import * as THREE from "three";
import CameraControls from "camera-controls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import offset from "offset";

import { newPos } from "../newPos";

CameraControls.install({ THREE: THREE });

export class VRHall {
    constructor(options) {
        this._options = Object.assign({
            container: document.body,
        }, options);
        this._gltfloader = new GLTFLoader();
        this._clock = new THREE.Clock();
        this._init();
        this._initEvent();
        if (this._options.debugger) {
            this._initTransformControls();
        }
        this._animate();
        window.addEventListener("resize", this._resize.bind(this));
        if (window.innerWidth / window.innerHeight > 1) {
            this._fitToBoxDisScl = 2.25;
        } else if (window.innerWidth / window.innerHeight <= 1) {
            this._fitToBoxDisScl = 1.2;
        }
    }

    _scene = null;
    _camera = null;
    _controls = null;
    _renderer = null;
    _raycaster = new THREE.Raycaster();
    _eventMeshes = [];
    _projectGr = [];
    _hallMesh = null;
    _floor = null;
    _prevMesh = 0;
    projectDivShow = false;
    mousefollowState = false;
    backtoallworkState = false;
    backtoallworkzoomState = false;
    // _fitToBoxDisScl = 2;
    _newPos = newPos;
    _EPS = 1e-5;
    _camRestPos = new THREE.Vector3();
    _camRestLookAt = new THREE.Vector3();
    _camRestRot = new THREE.Spherical();

    _size = {
        width: window.innerWidth,
        height: window.innerHeight,
    };
    //resize window
    _resize() {
        this._size.width = this._options.container.clientWidth;
        this._size.height = this._options.container.clientHeight;
        this._renderer.setSize(this._size.width, this._size.height);
        // update camera ratio
        this._camera.aspect = this._size.width / this._size.height;
        this._camera.updateProjectionMatrix();
    }

    //Three.js
    _init() {
        //renderer
        this._renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            transparent: true,
            logarithmicDepthBuffer: true,
        });
        this._renderer.setPixelRatio(window.devicePixelRatio);

        const { clientWidth, clientHeight } = this._options.container;
        this._renderer.setSize(this._size.width, this._size.height);
        this._options.container.appendChild(this._renderer.domElement);

        //add scene
        this._scene = new THREE.Scene();

        //add camera
        this._camera = new THREE.PerspectiveCamera(60, clientWidth / clientHeight, 0.1, 1000);
        const cameraPos = this._options.cameraPosition;
        if (window.innerWidth / window.innerHeight > 1){
            this._camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z + this._EPS);
        } else if (window.innerWidth / window.innerHeight <= 1) {
            this._camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z + this._options.mobileCamOffZ + this._EPS);
        }
        const cameraRot = this._options.cameraRotation;
        this._camera.rotation.set(cameraRot.x, cameraRot.y, cameraRot.z);
        this._scene.add(this._camera);

        // render
        // this._renderer.render(this._scene, this._camera);

        let controllerRotSpeed;
        if (window.innerWidth / window.innerHeight > 1){
            controllerRotSpeed = 0.3;
        } else if (window.innerWidth / window.innerHeight <= 1) {
            controllerRotSpeed = -0.3;
        }
        //controller
        this._controls = new CameraControls(this._camera, this._renderer.domElement);
        this._controls.maxDistance = this._EPS;
        this._controls.distance = 2;
        this._controls.dollySpeed = 0.3;
        this._controls.azimuthRotateSpeed = controllerRotSpeed;
        this._controls.polarRotateSpeed = controllerRotSpeed;
        this._controls.dollyToCursor = true;
        this._controls.dragToOffset = false;
        this._controls.smoothTime = 1.6;
        this._controls.draggingSmoothTime = 0.01;
        this._controls.restThreshold = 0.01;
        this._controls.maxPolarAngle = Math.PI * 0.6;
        this._controls.minPolarAngle = (Math.PI / 2) * 0.9;
        // this._controls.maxAzimuthAngle = Math.PI / 2;
        // this._controls.minAzimuthAngle = - Math.PI / 2;
        this._controls.truckSpeed = 1;
        this._controls.mouseButtons.left = CameraControls.ACTION.ROTATE;
        this._controls.mouseButtons.wheel = CameraControls.ACTION.ZOOM;
        this._controls.touches.one = CameraControls.ACTION.ROTATE;
        this._controls.touches.two = CameraControls.ACTION.NONE;
        this._controls.touches.three = CameraControls.ACTION.NONE;
        this._controls.maxZoom = 2;
        this._controls.minZoom = 1;
        this._controls.boundaryEnclosesCamera = true;
        this._controls.boundaryFriction = 0.2;
        this._controls.saveState();
        this._controls.setLookAt(this._camera.position.x, this._camera.position.y, this._camera.position.z + this._options.cameraOffZ, 0, 0, 0, true);

        // add lighting
        this._scene.add(new THREE.AmbientLight(0x404040, this._options.lightStrength));

        const dirLight = new THREE.DirectionalLight( 0xffffff, this._options.dirLightStrength );
        dirLight.position.set( 10, 20, 10 );
        this._scene.add( dirLight );

        //add helper
        if (this._options.debugger == true){
            this._scene.add(new THREE.AxesHelper(1000));
            this._gridHelper = new THREE.GridHelper(100, 50, 0x808080, 0x808080);
            this._gridHelper.position.y = this._options.floorY;
            this._gridHelper.material.opacity = 0.3;
            this._gridHelper.material.depthWrite = false;
            this._gridHelper.material.transparent = true;
            this._scene.add(this._gridHelper);
            // this._eventMeshes.push(this._gridHelper);
            // this._floor = this._gridHelper;
        }
    }

    _findRootMesh(mesh) {
        if (!mesh) {
            return null;
        }
        if (mesh.odata) {
            return mesh;
        } else {
            return this._findRootMesh(mesh.parent);
        }
    }

    _initEvent() {

        this._mouseMove();
        if (window.innerWidth / window.innerHeight > 1){
            this._controls.addEventListener('rest', () => {
                console.log("mousefollow");
                this._controls.getPosition(this._camRestPos);
                this._controls.getTarget(this._camRestLookAt);
                this._controls.getSpherical(this._camRestRot, true);
                this.mousefollowState = true;
            });
            this._controls.addEventListener('controlstart', () => { 
                console.log("controlstart"); 
                this.mousefollowState = false;
            });
            this._controls.addEventListener('control', () => {
                console.log("control"); 
                this.mousefollowState = false;
            });
            this._controls.addEventListener('controlend', () => {
                console.log("controlend"); 
                this._controls.getPosition(this._camRestPos);
                this._controls.getTarget(this._camRestLookAt);
                this._controls.getSpherical(this._camRestRot, true);
                this.mousefollowState = true;
            });
        }
        // this._controls.addEventListener('rest', () => {
        //     console.log("mousefollow");
        //     this._controls.getPosition(this._camRestPos);
        //     this._controls.getTarget(this._camRestLookAt);
        //     this._controls.getSpherical(this._camRestRot, true);
        //     this.mousefollowState = true;
        // });
        // this._controls.addEventListener('controlstart', () => { 
        //     console.log("controlstart"); 
        //     this.mousefollowState = false;
        // });
        // this._controls.addEventListener('control', () => {
        //     console.log("control"); 
        //     this.mousefollowState = false;
        // });
        // this._controls.addEventListener('controlend', () => {
        //     console.log("controlend"); 
        //     this._controls.getPosition(this._camRestPos);
        //     this._controls.getTarget(this._camRestLookAt);
        //     this._controls.getSpherical(this._camRestRot, true);
        //     this.mousefollowState = true;
        // });

        const projectDetail = document.getElementById("projectDetail");
        const projectDiv = document.getElementById("projectDiv");
        const originalProjectDivClass = projectDiv.className;
        const backicon = document.createElement("div");
        backicon.setAttribute("class", "backicon layerfourth noselect customCursor hightlight-text-deco");
        backicon.innerText = "back";
        document.body.appendChild(backicon);
        
        this._options.container.addEventListener('pointerdown', event => {
            this._startxy = {x: event.clientX, y: event.clientY};
        });
        this._options.container.addEventListener('pointerup', event => {
            const raycaster = this._raycaster;
            const pointer = new THREE.Vector2();

            const { x, y } = this._startxy;
            const { top, left } = offset(this._options.container);
            const offsetPoor = 2;
            if (
                Math.abs(event.clientX - x) > offsetPoor ||
                Math.abs(event.clientY - y) > offsetPoor
            ) {
                return;
            }
            pointer.x = ((event.clientX - left) / this._options.container.clientWidth) * 2 - 1;
            pointer.y = -((event.clientY - top) / this._options.container.clientHeight) * 2 + 1;

            //cauculate Raycast
            raycaster.setFromCamera(pointer, this._camera);

            //get intersection
            const intersects = raycaster.intersectObjects(this._eventMeshes, true);
            const mesh = intersects[0];

            // let projectDivShow = false;
            if (mesh) {
                console.log("clicked mesh check", mesh);
                // console.log(mesh.object.parent.name);
                if (mesh.object.parent.name == this._options.floorName) {
                    const v3 = mesh.point;
                    const lookat = this._camera.position.lerp(v3, 1 + this._EPS);
                    console.log(`floor clicked, move to v3, x: ${v3.x}, y: ${v3.y} z: ${v3.z}`);
                    const moveToY = this._options.floorY + this._options.cameraHeight;
                    this._moveTo(
                        { x: v3.x, y: moveToY, z: v3.z },
                        { x: lookat.x, y: moveToY, z: lookat.z },
                        3
                    );
                }
                const odataMesh = this._findRootMesh(mesh.object);
                if (mesh.object && odataMesh?.odata && this._options.debugger) {
                    this._transformControls.attach(odataMesh);
                }
                if (odataMesh?.odata) {
                    // console.log(odataMesh.odata);
                    this._prevMesh = odataMesh.odata.index;

                    if (this._controls && this.backtoallworkState == false) {
                        this._camLookAtExhibition(odataMesh.position, odataMesh.rotation, odataMesh);
                        this.projectDivShow = true;
                        // odataMesh.geometry.computeBoundingBox();
                        // const meshBBSize = odataMesh.geometry.boundingBox.getSize(new THREE.Vector3());
                        // const meshBBWidth = meshBBSize.x;
                        // const meshBBHeight = meshBBSize.y;
                        // const meshBBDepth = meshBBSize.z;
                        // const distanceToFit = this._controls.getDistanceToFitBox( meshBBWidth, meshBBHeight, meshBBDepth );
                        // this._controls.setLookAt(odataMesh.position.x, this._options.cameraHeight, odataMesh.position.z + distanceToFit * this._fitToBoxDisScl, 
                        //     odataMesh.position.x, this._options.cameraHeight, odataMesh.position.z, true);
                        // // this._controls.setLookAt(odataMesh.position.x, odataMesh.position.y, odataMesh.position.z + distanceToFit * this._fitToBoxDisScl, odataMesh.position.x, odataMesh.position.y, odataMesh.position.z, true);
                        // this._controls.rotateAzimuthTo(odataMesh.rotation.y, true).then(this.projectDivShow = true);
                    } 
                    if (this.backtoallworkState == true) {
                        this.projectDivShow = true;
                    }

                    if (this.projectDivShow) {
                        projectDiv.innerHTML = "";

                        if (window.innerWidth < 1280){
                            projectDetail.style.visibility = "hidden";
                        }

                        const heroImgDiv = document.createElement("div");
                        heroImgDiv.setAttribute("class", "project-heroImg");
                        if (odataMesh.odata.heroImg) {
                            const heroImg = document.createElement("img");
                            heroImg.src = odataMesh.odata.heroImg[0];
                            heroImg.alt = `${odataMesh.odata.title}_hero-img`;
                            heroImgDiv.appendChild(heroImg);
                        } else {
                            heroImgDiv.innerHTML = "";
                        }
                        const projectTitle = document.createElement("div");
                        projectTitle.setAttribute("class", "project-title");
                        let d = odataMesh.odata.department;
                        let t = odataMesh.odata.title;
                        let an = odataMesh.odata.author;
                        let y = odataMesh.odata.year;
                        if (!odataMesh.odata.department || odataMesh.odata.department === "other"){
                            d = "";
                        }
                        if (!odataMesh.odata.title){
                            t = "";
                        }
                        if (!odataMesh.odata.author){
                            an = "";
                        }
                        if (!odataMesh.odata.year) {
                            y = "";
                        }
                        projectTitle.innerHTML = 
                            `<h2>${d}</h2>
                            <h1>${t}</h1>
                            <h2>${an}<br>
                            ${y}</h2>`;
                        const projectDescription = document.createElement("div");
                        projectDescription.setAttribute("class", "project-description");
                        if (odataMesh.odata.description) {
                            projectDescription.innerHTML = `<div>${odataMesh.odata.description}</div>`;
                        } else {
                            projectDescription.innerHTML = "";
                        }
                        const projectImg = document.createElement("div");
                        projectImg.setAttribute("class", "project-img");
                        if (odataMesh.odata.img.length){
                            odataMesh.odata.img.forEach((eachimg) => {
                                // console.log(eachimg);
                                const img = document.createElement("img");
                                img.setAttribute("class", "zoomInImg");
                                img.src = eachimg[1];
                                img.alt = eachimg[0];
                                projectImg.appendChild(img);
                            });
                        } else {
                            projectImg.innerHTML = "";
                        }

                        const projVideo = document.createElement("div");
                        projVideo.setAttribute("class", "project-video");
                        if (odataMesh.odata.video){
                            // console.log(odataMesh.odata.video);
                            const vid = document.createElement("iframe");
                            vid.src = odataMesh.odata.video;
                            vid.title = `${odataMesh.odata.title}_video`;
                            vid.setAttribute('allowFullScreen', '');
                            projVideo.appendChild(vid);
                        } else {
                            projVideo.style.paddingTop = 0;
                            projVideo.style.height = 0;
                            projVideo.innerHTML = "";
                        }

                        const projectFooter = document.createElement("div");
                        projectFooter.setAttribute("class", "project-footer");
                        if (odataMesh.odata.attachment){
                            odataMesh.odata.attachment.forEach(eachAttachment => {
                                const attachmentA = document.createElement("a");
                                attachmentA.setAttribute("class", "highlight customCursor");
                                attachmentA.href = eachAttachment[1];
                                attachmentA.innerText = eachAttachment[0];
                                attachmentA.target = "_blank";
                                projectFooter.appendChild(attachmentA);
                            });
                        }
                        const linkA = document.createElement("a");
                        linkA.setAttribute("class", "highlight customCursor");
                        const emailA = document.createElement("a");
                        emailA.setAttribute("class", "highlight customCursor");
                        const socialMediaA = document.createElement("a");
                        socialMediaA.setAttribute("class", "highlight customCursor");
                        if (odataMesh.odata.link){
                            linkA.href = odataMesh.odata.link;
                            linkA.innerText = odataMesh.odata.link;
                            linkA.target = "_blank";
                            projectFooter.appendChild(linkA);
                        }
                        if (odataMesh.odata.email){
                            emailA.href = `mailto:${odataMesh.odata.email}`;
                            emailA.innerText = odataMesh.odata.email;
                            projectFooter.appendChild(emailA);
                        }
                        if (odataMesh.odata.socialMedia){
                            socialMediaA.href = odataMesh.odata.socialMedia;
                            socialMediaA.innerText = "social media";
                            socialMediaA.target = "_blank";
                            projectFooter.appendChild(socialMediaA);
                        }
                        projectDiv.appendChild(projectTitle);
                        projectDiv.appendChild(heroImgDiv);
                        projectDiv.appendChild(projectDescription);
                        projectDiv.appendChild(projectImg);
                        projectDiv.appendChild(projVideo);
                        projectDiv.appendChild(projectFooter);

                        projectDiv.setAttribute("class", `${originalProjectDivClass} ${odataMesh.odata.department}-g`);
                        projectDivTransIn();
                        projectDiv.scrollTop = 0;
                        setTimeout(function backiconVis() { 
                            backicon.style.visibility = "visible"; 
                            backicon.style.opacity = 1; }, 
                            500
                        );

                        projectDiv.addEventListener("click", (event) => {
                            event.preventDefault();
                            if (event.target.tagName != "IMG"){
                                projectDivTransOut();
                                this.projectDivShow = false;
                                backicon.style.visibility = "hidden";
                                backicon.style.opacity = 0;
                                this.backtoallworkzoomState = false;
                            } 
                        });
                        backicon.addEventListener("click", () => {
                            projectDivTransOut();
                            this.projectDivShow = false;
                            backicon.style.visibility = "hidden";
                            backicon.style.opacity = 0;
                            this.backtoallworkzoomState = false;
                        });                        
                        
                        const imgViewer = document.querySelector(".image-viewer");
                        const allImg = projectDiv.querySelectorAll(".zoomInImg");
                        allImg.forEach(eachImg => {
                            eachImg.addEventListener("click", (event) => {
                                imgViewer.style.display = "flex";
                                imgViewer.style.visibility = "visible";
                                const img = document.createElement("img");
                                img.src = event.target.src;
                                img.alt = event.target.alt;
                                imgViewer.appendChild(img);
                                img.style.animationName = "zoom";
                                img.style.animationDuration = "0.5s";
                                img.style.animationIterationCount = 1;
                                img.style.animationTimingFunction = "ease-in-out";
                                img.style.animationFillMode = "forwards";
        
                                imgViewer.addEventListener("click", (event) => {
                                    img.style.animationName = "zoomOut";
                                    img.style.animationDuration = "0.5s";
                                    img.style.animationIterationCount = 1;
                                    img.style.animationTimingFunction = "ease-in-out";
                                    img.style.animationFillMode = "forwards";
                                    img.addEventListener("animationend", () => {
                                        imgViewer.innerHTML = "";
                                        imgViewer.style.display = "none";
                                    });
                                });
                            });
                        })
                    } else {
                    }
                    function projectDivTransIn(){
                        projectDiv.style.transition = "transform 1s ease-in-out";
                        projectDiv.style.transform = "translateY(0)";
                    }
                    function projectDivTransOut(){
                        projectDiv.style.transition = "transform 1s ease-in-out";
                        projectDiv.style.transform = `translateY(-${projectDiv.getBoundingClientRect().height}px)`;
                    }
                }
            }
        });
    }

    _mouseMove(){
        const projectDetail = document.getElementById("projectDetail");
        const originalClass = projectDetail.className;
        const raycaster = this._raycaster;
        const pointer = new THREE.Vector2();
        let prevPointerX, prevPointerY = 0;

        let mousefollowX, mousefollowY = 0;

        this._options.container.addEventListener('pointermove', event => {
            if (this.backtoallworkState == true && this.backtoallworkzoomState == false) {
                pointer.x = - (event.clientX - (this._size.width) / 2) / (this._size.width/2);
                pointer.y = (event.clientY - (this._size.height) / 2) / (this._size.height/2);
                // console.log(pointer);
                prevPointerX = pointer.x;
                prevPointerY = pointer.y;
                const cameraPos = this._options.cameraPosition;
                if (window.innerWidth / window.innerHeight > 1) {
                    this._controls.setLookAt(
                        cameraPos.x + pointer.x * 8, cameraPos.y + pointer.y * 10, cameraPos.z + this._options.cameraOffZ,
                        0, 0, 0,
                        true
                    );
                } 
                else if (window.innerWidth / window.innerHeight <= 1) {
                    this._controls.setLookAt(
                        cameraPos.x + pointer.x * 25, cameraPos.y + pointer.y * 20, cameraPos.z + this._options.cameraOffZ + this._options.mobileCamOffZ,
                        0, 0, 0,
                        true
                    );
                }
            }
            if (this.backtoallworkState == false && this.mousefollowState == true) {
                pointer.x = - (event.clientX - (this._size.width) / 2) / (this._size.width / 2);
                pointer.y = - (event.clientY - (this._size.height) / 2) / (this._size.height / 2);
                // console.log(pointer);
                if (pointer.x > 0 && pointer.y > 0) {
                    mousefollowX = 0.1;
                    mousefollowY = 0.2;
                }
                if (pointer.x < 0 && pointer.y < 0) {
                    mousefollowX = -0.1;
                    mousefollowY = -0.2;
                }
                if (pointer.x > 0 && pointer.y < 0) {
                    mousefollowX = 0.1;
                    mousefollowY = -0.2;
                }
                if (pointer.x < 0 && pointer.y > 0) {
                    mousefollowX = -0.1;
                    mousefollowY = 0.2;
                }
                if (pointer.x >= -0.1 && pointer.x <= 0.1 && pointer.y >= -0.08 && pointer.y <= 0.08) {
                    mousefollowX = 0;
                    mousefollowY = 0;
                }
                // console.log(this._camRestPos, this._camRestLookAt, this._camRestRot);
                this._controls.rotateTo(this._camRestRot.theta + mousefollowX, this._camRestRot.phi + mousefollowY, true);
                // this._controls.setPosition(
                //     this._camRestPos.x + mousefollowX, this._camRestPos.y + mousefollowY, this._camRestPos.z,
                //     true
                // );
            }
            
            //show project detail left bottom corner
            const startxy = new THREE.Vector2();
            startxy.x =  event.clientX;
            startxy.y =  event.clientY;
            const { top, left } = offset(this._options.container);
            const offsetPoor = 2;
            if (
                Math.abs(event.clientX - startxy.x) > offsetPoor ||
                Math.abs(event.clientY - startxy.y) > offsetPoor
            ) {
                return;
            }
            pointer.x = ((event.clientX - left) / this._options.container.clientWidth) * 2 - 1;
            pointer.y = -((event.clientY - top) / this._options.container.clientHeight) * 2 + 1;

            //cauculate Raycast
            raycaster.setFromCamera(pointer, this._camera);

            //get intersection
            const intersects = raycaster.intersectObjects(this._eventMeshes, true);
            const mesh = intersects[0];

            if (mesh) {
                const odataMesh = this._findRootMesh(mesh.object);
                if (odataMesh?.odata) {
                    // console.log(odataMesh.odata);
                    projectDetail.style.visibility = "visible";
                    let detailDepartment = odataMesh.odata.department;
                    let detailTitle = odataMesh.odata.title;
                    let detailAuthor = odataMesh.odata.author;
                    let detailYear = odataMesh.odata.year;
                    if (detailDepartment === undefined || detailDepartment === "other") {
                        detailDepartment = "";
                    }
                    if (detailTitle === undefined) {
                        detailTitle = "";
                    }
                    if (detailAuthor === undefined) {
                        detailAuthor = "";
                    }
                    if (detailYear === undefined) {
                        detailYear = ""
                    }
                    projectDetail.innerHTML = `
                    <div>${detailDepartment}</div>
                    <div>${detailTitle}</div>
                    <div>${detailAuthor}<br>${detailYear}</div>`;
                    projectDetail.setAttribute("class", `${originalClass} ${odataMesh.odata.department}`);
                    // projectDetail.classList.add(`${odataMesh.odata.department}`); 
                } else {
                    projectDetail.style.visibility = "hidden";
                }
            } else {
                projectDetail.innerHTML = "";
                projectDetail.style.visibility = "hidden";
            }
        });
    }

    _moveTo(position, lookat, duration) {
        // this._controls.saveState();
        const lookatV3 = new THREE.Vector3(position.x, position.y, position.z);
        lookatV3.lerp(new THREE.Vector3(lookat.x, lookat.y, lookat.z), this._EPS);
        // const fromPosition = new THREE.Vector3();
        // const fromLookAt = new THREE.Vector3();
        // this._controls.getPosition(fromPosition);
        // this._controls.getTarget(fromLookAt);

        // const lookatV32 = new THREE.Vector3(position.x, position.y, position.z);
        // lookatV32.lerp(new THREE.Vector3(lookat.x, lookat.y, lookat.z), this._EPS);
        
        this._controls.setLookAt(
            position.x,
            position.y,
            position.z,
            lookatV3.x,
            lookatV3.y,
            lookatV3.z,
            true
        );
    }
 
    _animate() {
        const delta = this._clock.getDelta();
        requestAnimationFrame(this._animate.bind(this));
        if (this._renderer) {
            this._renderer.render(this._scene, this._camera);
        }
        if (this._controls) {
            const updated = this._controls.update(delta);
            if (updated){
                this._renderer.render(this._scene, this._camera);
            }
        }
    }

    _initTransformControls() {
        this._transformControls = new TransformControls(this._camera, this._renderer.domElement);
        this._transformControls.setSpace("local");
        this._scene.add(this._transformControls);

        this._transformControls.addEventListener('pointerDown', () => {
            this._controls.enabled = false;
        });
        this._transformControls.addEventListener('pointerUp', () => {
            this._controls.enabled = true;
        });
        this._transformControls.addEventListener('objectChange', () => {
            const { position, scale, rotation } = this._transformControls.object;
            console.log(JSON.stringify({
                position,
                scale,
                rotation: { x: rotation.x, y: rotation.y, z: rotation.z }
            }));
        });

        window.addEventListener("keydown", (e) => {
            switch (e.key) {
                case "q":
                    this._transformControls.setMode("translate");
                    break;
                case "w":
                    this._transformControls.setMode("rotate");
                    break;
                case "e":
                    this._transformControls.setMode("scale");
                    break;
            }
        });
    }

    async _initInteraction() {
        const blocker = document.getElementById("blocker");
        let blockerShow = true;

        const listWorks = document.querySelector("#works-list");
        const listOfWorksButton = document.querySelector("#listOfWorks");
        let showListWorks = false;
        const listWorksFocus = document.querySelectorAll(".listProject");
        let sideWrapper = document.querySelector(".side-wrapper");

        // const topWrapper = document.querySelector(".top-wrapper");
        const topWrapper = document.querySelectorAll(".top-wrapper");
        const nav = document.querySelector(".nav");

        const allWorks = document.getElementById("allWorks");
        const exhibitionHall = document.getElementById("exhibitionHall");
        const projectDiv = document.getElementById("projectDiv");

        const aboutPg = document.getElementById("about-page");
        const about = document.getElementById("about");
        let showAboutPg = false;

        blocker.addEventListener("click", async () => {
            blockerShow = false;
            blocker.style.visibility = "hidden";
            blocker.style.zIndex = "-1";
            listOfWorksButton.style.visibility = "visible";
            await this._initHall(false);

            topWrapper.forEach( d => {
                d.classList.remove("layerover");
                d.classList.add("layertop");
            })
            nav.style.color = "#2b2b2b";
            document.getElementById("logo-img").src = "./logo-b.png";
        });
        if (blockerShow) {
            topWrapper.forEach( d => {
                d.classList.remove("layertop");
                d.classList.add("layerover");
            })
            nav.style.color = "white";
            document.getElementById("logo-img").src = "./logo-w.png";
        }

        let sideWrapperOffsetX = sideWrapper.getBoundingClientRect().width - listOfWorksButton.getBoundingClientRect().width;
        sideWrapper.style.transform = `translateX(${sideWrapperOffsetX}px)`;

        listOfWorksButton.addEventListener("click", () => {
            showListWorks = !showListWorks;
            if (showListWorks){
                listofworksTransIn();
            } else {
                listofworksTransOut();
            }
        });
        listWorks.addEventListener("click", () => {
            showListWorks = !showListWorks;
            if (showListWorks){
                listofworksTransIn();
            } else {
                listofworksTransOut();
            }
        });

        this._options.container.addEventListener("click", () => {
            if (this.projectDivShow == true && showListWorks == true) {
                listofworksTransOut();
                showListWorks = false;
            }
            if (showListWorks == true) {
                listofworksTransOut();
                showListWorks = false;
            }
        })
        
        //focus selected list of works
        listWorksFocus.forEach(eachWork => {
            eachWork.addEventListener("click", (e) => {
                let focusId = e.target.id;
                // console.log(typeof e.target.id);
                for (var i in this._projectGr){
                    let indexI = this._projectGr[i].odata.index;
                    // console.log(typeof indexI, indexI, typeof i, i);
                    if (focusId == indexI) {
                        // console.log(focusId, indexI, this._projectGr[i].odata.title);
                        this._camLookAtExhibition(this._projectGr[i].position, this._projectGr[i].rotation, this._projectGr[i]);
                        this._prevMesh = indexI;
                        listofworksTransOut();
                        showListWorks = false;
                        if (this.projectDivShow == true) {
                            transOutY(projectDiv);
                            showListWorks = false;
                        }
                    }
                }
            });
        });

        about.addEventListener("click", () => {
            showAboutPg = ! showAboutPg;
            if (showAboutPg) {
                transInY(aboutPg);
                if (blockerShow){
                    aboutPg.classList.remove("layersecond");
                    aboutPg.classList.add("layertop");
                    nav.style.transition = "color 1s ease-in-out";
                    nav.style.color = "#2b2b2b";
                    setTimeout(function changeLogo(){
                        document.getElementById("logo-img").src = "./logo-b.png";
                    }, 50);
                } else {
                    aboutPg.classList.remove("layertop");
                    aboutPg.classList.add("layersecond");
                    // nav.style.transition = "color 1s ease-in-out";
                    // nav.style.color = "white";
                    // setTimeout(function changeLogo(){
                    //     document.getElementById("logo-img").src = "./logo-w.png";
                    // }, 50);
                    if (showListWorks) {
                        listofworksTransOut();
                        showListWorks = false;
                    }
                }
            } else {
                transOutY(aboutPg);
                if (blockerShow){
                    nav.style.transition = "color 1s ease-in-out";
                    nav.style.color = "white";
                    setTimeout(function changeLogo(){
                        document.getElementById("logo-img").src = "./logo-w.png";
                    }, 900);
                } else {
                    // nav.style.transition = "color 1s ease-in-out";
                    // nav.style.color = "#2b2b2b";
                    // setTimeout(function changeLogo(){
                    //     document.getElementById("logo-img").src = "./logo-b.png";
                    // }, 900);
                }
            }
        });
        aboutPg.addEventListener("click", () => { 
            showAboutPg = false;
            transOutY(aboutPg);
            if (blockerShow){
                nav.style.transition = "color 1s ease-in-out";
                nav.style.color = "white";
                setTimeout(function changeLogo(){
                    document.getElementById("logo-img").src = "./logo-w.png";
                }, 900);
            }
        });

        exhibitionHall.addEventListener("click", () => {
            const backicon = document.querySelector(".backicon");
            // console.log(this.projectDivShow);
            if (this.projectDivShow) {
                transOutY(projectDiv);
                this.projectDivShow = false;
                backicon.style.visibility = "hidden";
                backicon.style.opacity = 0;
            }
            if (showListWorks) {
                listofworksTransOut();
                showListWorks = false;
            }
            if (showAboutPg) {
                transOutY(aboutPg);
                showAboutPg = false;
            }
            this._initHall(true);
            this._eventMeshes.push(this._floor);
        });
        allWorks.addEventListener("click", () => {
            const backicon = document.querySelector(".backicon");
            if (this.projectDivShow) {
                transOutY(projectDiv);
                this.projectDivShow = false;
                backicon.style.visibility = "hidden";
                backicon.style.opacity = 0;
            }
            if (showListWorks) {
                listofworksTransOut();
                showListWorks = false;
            }
            if (showAboutPg) {
                transOutY(aboutPg);
                showAboutPg = false;
            }
            this._backToAllWorks();
        });

        function transInY(element){
            element.style.transition = "transform 1s ease-in-out";
            element.style.transform = "translateY(0)";
        }
        function transOutY(element){
            element.style.transition = "transform 1s ease-in-out";
            element.style.transform = `translateY(-${element.getBoundingClientRect().height}px)`;
        }
        function listofworksTransIn(){
            sideWrapper.style.transition = "transform 1s ease-in-out";
            sideWrapper.style.transform = "translateX(17px)";
        }
        function listofworksTransOut(){
            sideWrapper.style.transition = "transform 1s ease-in-out";
            sideWrapper.style.transform = `translateX(${listWorks.getBoundingClientRect().width}px)`;
        }
    }

    async _initHall(focusProject) {
        this.backtoallworkState = false;
        // console.log(this._projectGr);
        const maxSize = this._options.maxSize;

        let refIndex;
        for (var i in this._projectGr) {
            let indexI = this._projectGr[i].odata.index;
            // this._projectGr[i].position.set(this._newPos[indexI].position.x * this._options.hallScl, this._newPos[indexI].position.y + (this._options.floorY + this._options.cameraHeight), - (this._newPos[indexI].position.z * this._options.hallScl));
            this._projectGr[i].position.set(this._newPos[indexI].position.x * this._options.hallScl, this._newPos[indexI].position.y + (this._options.floorY + this._options.projectHeight), - (this._newPos[indexI].position.z * this._options.hallScl));

            if (this._projectGr[i].odata.orientation == "horizontal") {
                this._projectGr[i].scale.set(1, 1, 1);
            } 
            else if (this._projectGr[i].odata.orientation == "vertical") {
                this._projectGr[i].scale.set(0.7, 0.7, 0.7);
            }
            this._projectGr[i].rotation.set(this._newPos[indexI].rotation.x, this._newPos[indexI].rotation.y, this._newPos[indexI].rotation.z);
            if (indexI == this._prevMesh && focusProject){
                refIndex = i;
            }
            if (this._options.debugger == true){
                const boundingBox = new THREE.BoxHelper( this._projectGr[i], 0xffff00 );
                this._scene.add(boundingBox);
            }
        }

        if (focusProject){
            this._camLookAtExhibition(this._projectGr[refIndex].position, this._projectGr[refIndex].rotation, this._projectGr[refIndex]);
        } else {
            if (this._controls) {
                this._controls.setLookAt(
                    this._options.initialPos.x, this._options.initialPos.y, this._options.initialPos.z + 1, 
                    this._options.initialPos.x, this._options.initialPos.y, this._options.initialPos.z, 
                    true
                );
                // this._controls.rotateAzimuthTo(Math.PI / 6, true);
            }
        }

        this._controls.mouseButtons.left = CameraControls.ACTION.ROTATE;
        this._controls.touches.one = CameraControls.ACTION.ROTATE;
        this._scene.add(this._floor);
        this._scene.add(this._hallMesh);
        // console.log(this._newPos, this._projectGr);

        const origianlfloorbox = new THREE.BoxHelper(this._floor, 0xffff00);
        origianlfloorbox.geometry.computeBoundingBox();
        const meshBBSize = origianlfloorbox.geometry.boundingBox.getSize(new THREE.Vector3());
        const meshBBWidth = meshBBSize.x;
        const meshBBHeight = meshBBSize.y;
        const meshBBDepth = meshBBSize.z;
        // console.log(meshBBSize);
        const Box3 = new THREE.Box3();
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(meshBBWidth-4, 20, meshBBDepth-4),
            // new THREE.MeshBasicMaterial( {color: 0x00ff00} ),
        ); 
        mesh.geometry.computeBoundingBox();
        mesh.position.x = mesh.position.x - 1;
        mesh.position.y = 10;
        mesh.position.z = mesh.position.z - 2;
        Box3.copy( mesh.geometry.boundingBox ).applyMatrix4( mesh.matrixWorld );
        this._controls.setBoundary(Box3);
        if (this._options.debugger){
            const newbox = new THREE.BoxHelper(mesh, 0xff0000);
            this._scene.add(newbox);
        }


        // this._controls.addEventListener('rest', () => {
        //     console.log("mousefollow");
        //     this._controls.getPosition(this._camRestPos);
        //     this._controls.getTarget(this._camRestLookAt);
        //     this._controls.getSpherical(this._camRestRot, true);
        //     this.mousefollowState = true;
        // });
        // this._controls.addEventListener('controlstart', () => { 
        //     console.log("controlstart"); 
        //     this.mousefollowState = false;
        // });
        // this._controls.addEventListener('control', () => {
        //     console.log("control"); 
        //     this.mousefollowState = false;
        // });
    }

    _camLookAtExhibition(target, targetRot, t){
        if (this._controls){
            // this._controls.maxPolarAngle = Math.PI * 0.6;
            // this._controls.minPolarAngle = (Math.PI / 2) * 0.9;
            t.geometry.computeBoundingBox();
            const meshBBSize = t.geometry.boundingBox.getSize(new THREE.Vector3());
            const meshBBWidth = meshBBSize.x;
            const meshBBHeight = meshBBSize.y;
            const meshBBDepth = meshBBSize.z;
            const distanceToFit = this._controls.getDistanceToFitBox( meshBBWidth, meshBBHeight, meshBBDepth );
            if (this.backtoallworkState == true) {
                this._controls.setLookAt(
                    t.position.x, t.position.y, t.position.z + distanceToFit * this._fitToBoxDisScl,
                    t.position.x, t.position.y, t.position.z,
                    true
                );
                this.backtoallworkzoomState = true;
            } else {
                this._controls.setLookAt(t.position.x, this._options.cameraHeight, t.position.z + distanceToFit * this._fitToBoxDisScl,
                    t.position.x, this._options.cameraHeight, t.position.z,
                    true
                );
            }
            this._controls.rotateAzimuthTo(targetRot.y, true);
            this.mousefollowState = false;
        }
    }

    _backToAllWorks() {
        this._scene.remove(this._hallMesh);
        this._scene.remove(this._floor);
        this._eventMeshes = [];

        this._projectGr.forEach(eachProj => {
            // console.log("AllWorksLayout:", eachProj.odata.index, eachProj.odata.allworkPos, this._projectGr[i].odata.allworkPos.allworkRot);
            eachProj.position.set(eachProj.odata.allworkPos.x, eachProj.odata.allworkPos.y, eachProj.odata.allworkPos.z);
            eachProj.rotation.set(eachProj.odata.allworkRot.x, eachProj.odata.allworkRot.y, eachProj.odata.allworkRot.z);
            eachProj.scale.set(1, 1, 1);
            this._eventMeshes.push(eachProj);
        });
        if (this._controls) {
            this._controls.mouseButtons.left = CameraControls.ACTION.NONE;
            this._controls.touches.one = CameraControls.ACTION.NONE;
            // this._controls.reset(true);
            // this._controls.setLookAt(this._camera.position.x, this._camera.position.y, this._camera.position.z + this._options.cameraOffZ, 0, 0, 0, true);
            if (window.innerWidth / window.innerHeight > 1) {
                this._camera.position.set(this._options.cameraPosition.x, this._options.cameraPosition.y, this._options.cameraPosition.z);
            } else if (window.innerWidth / window.innerHeight <= 1) {
                this._camera.position.set(this._options.cameraPosition.x, this._options.cameraPosition.y, this._options.cameraPosition.z + this._options.mobileCamOffZ);
            }
            this._controls.setLookAt(this._camera.position.x, this._camera.position.y, this._camera.position.z + this._options.cameraOffZ, 0, 0, 0, true);
            // this._controls.maxPolarAngle = Math.PI;
            // this._controls.minPolarAngle = 0;
            this._controls.boundaryEnclosesCamera = false;
        }
        this.backtoallworkState = true;
        this.backtoallworkzoomState = false;
        this.mousefollowState = false;
    }

    //load items
    async loadItems(items) {
        const textureLoader = new THREE.TextureLoader();
        const pos = { x: 0, y: 0, z: 0 };
        let layerS = 0;
        let posData = {};
        let maxSize = this._options.maxSize;
        if (window.innerWidth / window.innerHeight > 1){
            layerS = this._options.layerProjectNum;
            posData = {
                layerSize: layerS,
                d: this._options.projectDistance,
                a: 2 * Math.PI / layerS,
                num: items.length / layerS
            };
            maxSize = this._options.maxSize;
        } else if (window.innerWidth / window.innerHeight < 1) {
            layerS = this._options.projectDistance - 4;
            posData = {
                layerSize: layerS,
                d: this._options.projectDistance,
                a: 2 * Math.PI / layerS,
                num: items.length / layerS
            };
            maxSize = this._options.maxSize;
        }
        // const layerS = this._options.layerProjectNum;
        // const posData = {
        //     layerSize: layerS,
        //     d: this._options.projectDistance,
        //     a: 2 * Math.PI / layerS,
        //     num: items.length / layerS
        // };
        // let maxSize = this._options.maxSize;
        // let width, height;
        let width = maxSize;
        let height = (841/1190)*width;
        const offsetX = ((posData.layerSize - 1) * posData.d * this._options.layoutXDistanceScl) / 2;
        const offsetY = (Math.ceil(posData.num - 1) * maxSize * this._options.layoutYDistanceScl) / 2;
        let counter = 0;
        items.forEach(async (item) => {
            //add project items to canvas
            let { index, department, title, author, type, year, description, heroImg, img, video, link, email, socialMedia, orientation, attachment, allworkPos, allworkRot } = item;
            //create project plane
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            //check image exist
            if (heroImg) {
                material.color.set(0xffffff);
                //add project frame + texture img
                const texture = await textureLoader.loadAsync(heroImg[1]);
                // console.log("texture", texture);
                const prevWidth = texture.image.width;
                const prevHeight = texture.image.height;
                if (prevWidth > maxSize) {
                    if (prevWidth / prevHeight > 1 || orientation == "horizontal") {
                        width = maxSize;
                        height = (prevHeight / prevWidth) * width;
                    } else if (prevWidth / prevHeight < 1 || orientation == "vertical") {
                        height = maxSize;
                        width = (prevWidth / prevHeight) * height;
                    } else if (prevWidth / prevHeight == 1) {
                        height = 0.5 * maxSize;
                        width = height;
                    }
                }
                material.map = texture;
            } else {
                if (orientation == "vertical") {
                    height = maxSize;
                    width = height * (841 / 1190);
                } else {
                    width = maxSize;
                    height = (841 / 1190) * width;
                }
                material.map = null;
                material.color.set(0xfafafa);
            }
            const geometry = new THREE.BoxGeometry(width, height, this._options.depth);
            const plane = new THREE.Mesh(geometry, material);
            const layerNum = Math.floor(index / posData.layerSize);
            const layerPos = index % posData.layerSize;
            // console.log(`index: ${index}, layerNum: ${Math.floor(index / posData.layerSize)}, layerPos: ${layerPos}`);
            pos.x = layerPos * posData.d * this._options.layoutXDistanceScl - offsetX;
            pos.y = offsetY - layerNum * maxSize * this._options.layoutYDistanceScl;
            // console.log(`index: ${index}, layerNum: ${layerNum}, layerPos: ${layerPos}, posX: ${pos.x}, posZ: ${pos.z}`);
            plane.position.set(pos.x, pos.y, pos.z);
            item.allworkPos = {x: plane.position.x, y: plane.position.y, z: plane.position.z};
            // console.log("allworks", index, pos);
            if (orientation === "vertical"){
                plane.rotation.set(0, 0, - Math.PI/2);
                item.allworkRot = {x: plane.rotation.x, y: plane.rotation.y, z: plane.rotation.z};
            } else {
                plane.rotation.set(0, 0, 0);
                item.allworkRot = {x: plane.rotation.x, y: plane.rotation.y, z: plane.rotation.z};
            }
            plane.scale.set(1, 1, 1);
            plane.odata = item;
            this._eventMeshes.push(plane);
            this._projectGr.push(plane);
            this._scene.add(plane);
            counter ++;
            if (counter == items.length){
                let loader = document.getElementById("loader");
                this._callanimation(loader, "fade", "1s", "0", "ease-in-out", "forwards", "hidden", "none", this.callback, 1000);
                await this._listWorks(items);
                await this._initInteraction();
            }
        });
        console.log("Items Loaded");
    }
    async _callanimation(element, animName, animDur, animDelayT, animTimingFunc, animDirection, vis, display, callback, callbackTimeout) {
        element.style.animationName = animName;
        element.style.animationDuration = animDur;
        element.style.animationDelay = animDelayT;
        element.style.animationTimingFunction = animTimingFunc;
        element.style.animationIterationCount = 1;
        element.style.animationFillMode = animDirection;
        setTimeout(function () { callback(element, vis, display) }, callbackTimeout);
    }
    callback(element, vis, display){
        element.style.visibility = vis;
        element.style.display = display;
    }

    async _listWorks(data){
        const listWorks = document.getElementById("works-list");
        
        const other = document.createElement("div");
        const otherTitle = document.createElement("h1");
        other.appendChild(otherTitle);
        other.setAttribute("class", "other");

        const MUD = document.createElement("div");
        const MUDTitle = document.createElement("h1");
        MUDTitle.innerHTML = "MUD";
        MUD.appendChild(MUDTitle);
        MUD.setAttribute("class", "MUD");

        const MUP = document.createElement("div");
        const MUPTitle = document.createElement("h1");
        MUPTitle.innerHTML = "MUP";
        MUP.appendChild(MUPTitle);
        MUP.setAttribute("class", "MUP");

        const MUDT = document.createElement("div");
        const MUDTTitle = document.createElement("h1");
        MUDTTitle.innerHTML = "MUDT";
        MUDT.appendChild(MUDTTitle);
        MUDT.setAttribute("class", "MUDT");

        const MUA = document.createElement("div");
        const MUATitle = document.createElement("h1");
        MUATitle.innerHTML = "MUA";
        MUA.appendChild(MUATitle);
        MUA.setAttribute("class", "MUA");

        const BAUS = document.createElement("div");
        const BAUSTitle = document.createElement("h1");
        BAUSTitle.innerHTML = "BAUS";
        BAUS.appendChild(BAUSTitle);
        BAUS.setAttribute("class", "BAUS");
        
        listWorks.appendChild(MUD);
        listWorks.appendChild(MUP);
        listWorks.appendChild(MUDT);
        listWorks.appendChild(MUA);
        listWorks.appendChild(BAUS);
        listWorks.appendChild(other);
        data.forEach(d => {
            const projectIndex = document.createElement("li");
            projectIndex.innerHTML = d.index + 1;
            if (d.type === "project"){

            } else {

            }
            const department = document.createElement("li");
            const title = document.createElement("li");
            const author = document.createElement("li");
            if (d.department) {
                department.innerHTML = d.department;
            }
            title.setAttribute("id", d.index);
            title.setAttribute("class", "listProject highlight customCursor");
            if (d.title) {
                title.innerHTML = d.title;
            } else {
                title.innerHTML = "";
            }
            if (d.author){
                author.innerHTML = d.author;
            } else {
                author.innerHTML = "";
            }
            if (d.department){
                if (d.department == "MUD"){
                    MUD.appendChild(projectIndex);
                    MUD.appendChild(title);
                    MUD.appendChild(author);
                } 
                else if (d.department == "MUP"){
                    MUP.appendChild(projectIndex);
                    MUP.appendChild(title);
                    MUP.appendChild(author);
                }
                else if (d.department == "MUDT"){
                    MUDT.appendChild(projectIndex);
                    MUDT.appendChild(title);
                    MUDT.appendChild(author);
                }
                else if (d.department == "MUA"){
                    MUA.appendChild(projectIndex);
                    MUA.appendChild(title);
                    MUA.appendChild(author);
                }
                else if (d.department == "BAUS"){
                    BAUS.appendChild(projectIndex);
                    BAUS.appendChild(title);
                    BAUS.appendChild(author);
                } 
                else if (d.department == "other") {
                    other.appendChild(projectIndex);
                    other.appendChild(title);
                    other.appendChild(author);
                }
            }
        });
    }

    //about page
    async loadAboutPage(items) {
        const aboutPg = document.getElementById("about-page");
        items.forEach((item) => {
            const div = document.createElement("div");
            const abbrevDiv = document.createElement("div");
            abbrevDiv.setAttribute("class", "about-1");
            const majorDiv = document.createElement("div");
            majorDiv.setAttribute("class", "about-2");
            const aboutDiv = document.createElement("div");
            aboutDiv.setAttribute("class", "about-3");
            const linkDiv = document.createElement("a");

            if (item.Abbreviation) {
                abbrevDiv.innerHTML = item.Abbreviation;
                div.appendChild(abbrevDiv);
            }
            if (item.Major){
                majorDiv.innerHTML = item.Major;
            }
            if (item.About){
                aboutDiv.innerHTML = item.About;
            }
            if (item.Link){
                linkDiv.setAttribute("class", "highlight customCursor");
                linkDiv.href = item.Link;
                linkDiv.innerText = item.Link;
                linkDiv.target = "_blank";
            }
            div.appendChild(majorDiv);
            div.appendChild(aboutDiv);
            div.appendChild(linkDiv);
            aboutPg.appendChild(div);
        });
    }

    //load gallery model, glTF/glb
    async loadHall(params) {
        const { url, position, scale, rotation, onProgress } = params;
        const gltf = await this.loadGltf({ url, onProgress });
        if (position) {
            gltf.scene.position.set(position.x, position.y, position.z);
        }
        if (scale) {
            gltf.scene.scale.set(scale, scale, scale);
        }
        if (rotation) {
            gltf.scene.rotation.set(rotation.x, rotation.y, rotation.z);
        }
        // this._eventMeshes.push(gltf.scene);
        this._hallMesh = gltf.scene;
        console.log("Hall Loaded");
    }
    async loadModel(params) {
        const { url, onProgress, position, scale, rotation } = params;
        const gltf = await this.loadGltf({ url, onProgress });
        if (position) {
            gltf.scene.position.set(position.x, position.y, position.z);
        }
        if (scale) {
            gltf.scene.scale.set(scale, scale, scale);
        }
        if (rotation) {
            gltf.scene.rotation.set(rotation.x, rotation.y, rotation.z);
        }
        gltf.scene.name = this._options.floorName;
        this._eventMeshes.push(gltf.scene);
        this._floor = gltf.scene;
        console.log("Floor Loaded");
    }

    loadGltf(params) {
        const { url, onProgress } = params;
        return new Promise((resolve) => {
            this._gltfloader.load(
                url,
                (gltf) => {
                    resolve(gltf);
                },
                (progress) => {
                    if (onProgress) {
                        onProgress(progress);
                    }
                }
            );
        });
    }
}