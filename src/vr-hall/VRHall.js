import * as THREE from "three";
import CameraControls from "camera-controls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

import { newPos } from "../newPos";

CameraControls.install({ THREE: THREE });

export class VRHall {
    constructor(options) {
        this._options = Object.assign({
            container: document.body,
        }, options);
        this._gltfloader = new GLTFLoader();
        this._clock = new THREE.Clock();
        this._eventMeshes = [];
        this._projectGr = [];
        this._newPos = newPos;
        this.camFollowMove = this._options.camMoveFollowState;
        this.projDivShow = false;
        this._prevMesh = 0;
        this._init();
        this._initEvent();
        if (this._options.debugger) {
            this._initTransformControls();
        }
        this._animate();
        window.addEventListener("resize", this._resize.bind(this));
    }


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
        this._camera = new THREE.PerspectiveCamera(70, clientWidth / clientHeight, 0.1, 1000);
        const cameraPos = this._options.cameraPosition;
        if (window.innerWidth / window.innerHeight > 1){
            this._camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
        } else if (window.innerWidth / window.innerHeight <= 1) {
            this._camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z + 12);
        }
        const cameraRot = this._options.cameraRotation;
        this._camera.rotation.set(cameraRot.x, cameraRot.y, cameraRot.z);
        this._scene.add(this._camera);

        // render
        // this._renderer.render(this._scene, this._camera);

        // add lighting
        this._scene.add(new THREE.AmbientLight(0xffffff, this._options.lightStrength));

        const dirLight = new THREE.DirectionalLight( 0xffffff, 5 );
        dirLight.position.set( - 10, 20, -10 );
        this._scene.add( dirLight );

        //add helper
        if (this._options.debugger) {
            this._scene.add(new THREE.AxesHelper(1000));
            const helper = new THREE.DirectionalLightHelper( dirLight, 5 );
            this._scene.add(helper);
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

    _cammovefollow(event) {
        event.preventDefault();
        // console.log("pointermove activated");
        const pointer = new THREE.Vector2();
        pointer.x = - (event.clientX - (window.innerWidth) / 2) / (window.innerWidth/2);
        pointer.y = - (event.clientY - (window.innerHeight) / 2) / (window.innerHeight/2);
        this._camera.position.x += (pointer.x - this._camera.position.x) * .06;
        this._camera.position.y += (- pointer.y - this._camera.position.y) * .06;
        this._camera.lookAt(this._scene.position);
        return this._cammovefollow;
    }

    _initEvent() {
        const raycaster = new THREE.Raycaster();

        //main display camera movement
        this._cammovefollow =  this._cammovefollow.bind(this);
        if (this.camFollowMove) {
            window.addEventListener("pointermove", this._cammovefollow);
        }

        const projectDetail = document.getElementById("projectDetail");
        const projectDiv = document.getElementById("projectDiv");
        const backicon = document.createElement("div");
        backicon.setAttribute("class", "backicon layerthird noselect customCursor");
        backicon.innerText = ">>";

        const pointer = new THREE.Vector2();
        //show project detail left bottom corner
        this._options.container.addEventListener('pointermove', event => {
            pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointer, this._camera);
            //get intersection
            const intersects = raycaster.intersectObjects(this._eventMeshes);
            const mesh = intersects[0];
            if (mesh) {
                const odataMesh = this._findRootMesh(mesh.object);
                if (odataMesh?.odata) {
                    projectDetail.style.visibility = "visible";
                    projectDetail.innerHTML = `
                    <h5>${odataMesh.odata.department}</h5>
                    <h3>${odataMesh.odata.title}</h3>
                    <h5>${odataMesh.odata.author}<br>${odataMesh.odata.year}</h5>`;
                }
            } else {
                projectDetail.innerHTML = "";
            }
        });
        this._options.container.addEventListener('click', event => {
            pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointer, this._camera);
            //get intersection
            const intersects = raycaster.intersectObjects(this._eventMeshes);
            const mesh = intersects[0];
            const projectDetail = document.getElementById("projectDetail");
            if (mesh) {
                const odataMesh = this._findRootMesh(mesh.object);
                if (odataMesh?.odata) {
                    projectDetail.innerHTML = `
                    <h5>${odataMesh.odata.department}</h5>
                    <h3>${odataMesh.odata.title}</h3>
                    <h5>${odataMesh.odata.author}<br>${odataMesh.odata.year}</h5>`;
                }
            } else {
                projectDetail.innerHTML = "";
            }
        });
        this._options.container.addEventListener('pointerdown', event => {
            this._startxy = [event.clientX, event.clientY];
        });
        this._options.container.addEventListener('pointerup', event => {
            const [sx, sy] = this._startxy;
            if (Math.abs(event.clientX - sx) > 3 || Math.abs(event.clientY - sy) > 3) {
                return;
            }
            pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

            //cauculate Raycast
            raycaster.setFromCamera(pointer, this._camera);

            //get intersection
            const intersects = raycaster.intersectObjects(this._eventMeshes);
            const mesh = intersects[0];

            let projectDivShow = false;
            if (mesh) {
                console.log("clicked mesh check", mesh);
                const v3 = mesh.point;
                if (mesh.object.type == this._options.floorName) {
                    console.log(`floor clicked, move to v3, x: ${v3.x}, y: ${v3.y} z: ${v3.z}`);
                    this._controls.moveTo(v3.x, this._options.floorY + this._options.cameraHeight, v3.z, true);
                }
                const odataMesh = this._findRootMesh(mesh.object);
                if (mesh.object && odataMesh?.odata && this._options.debugger) {
                    this._transformControls.attach(odataMesh);
                }
                if (odataMesh?.odata) {
                    // console.log(odataMesh.odata);
                    this._prevMesh = odataMesh.odata.index;
                    this.camFollowMove = false;
                    if (this.camFollowMove === false) {
                        // console.log(camFollowMove, "remove pointermove event");
                        window.removeEventListener("pointermove", this._cammovefollow);
                    }
                    if (this._controls == null){
                        this._controls = new CameraControls(this._camera, this._renderer.domElement);
                        this._controls.maxDistance = this._options.controlMaxD;
                        this._controls.minDistance = this._options.controlMinD;
                        this._controls.distance = 2;
                        this._controls.dollySpeed = 0.5;
                        this._controls.azimuthRotateSpeed = 0.5;
                        this._controls.polarRotateSpeed = 0.5;
                        this._controls.dollyToCursor = true;
                        this._controls.saveState();
                    }
                    if (this._controls) {
                        this._controls.enabled = true;
                        this._controls.fitToBox(odataMesh, true, { paddingTop: 0.5, paddingRight: 0.5, paddingBottom: 0.5, paddingLeft: 0.5 })
                        .then(projectDivShow = true);
                        this._controls.rotateAzimuthTo(odataMesh.rotation.y, true);
                    } 
                    if (this._gridHelper === undefined){
                        this._gridHelper = new THREE.GridHelper(100, 50, 0x808080, 0x808080);
                        this._gridHelper.position.y = this._options.floorY;
                        this._gridHelper.material.opacity = 0.3;
                        this._gridHelper.material.depthWrite = false;
                        this._gridHelper.material.transparent = true;
                        this._scene.add(this._gridHelper);
                        this._eventMeshes.push(this._gridHelper);
                    }

                    document.body.appendChild(backicon);

                    if (projectDivShow) {
                        projectDiv.innerHTML = "";

                        if (window.innerWidth < 1280){
                            projectDetail.style.visibility = "hidden";
                        }

                        const heroImgDiv = document.createElement("div");
                        heroImgDiv.setAttribute("class", "project-heroImg");
                        const heroImg = document.createElement("img");
                        heroImg.setAttribute("class", "zoomInImg");
                        if (odataMesh.odata.heroImg) {
                            heroImg.src = odataMesh.odata.heroImg[0];
                            heroImg.alt = `${odataMesh.odata.title}_hero-img`
                        } else {
                            heroImg.src = "./Slide0.jpg";
                        }
                        heroImgDiv.appendChild(heroImg);
                        const projectTitle = document.createElement("div");
                        projectTitle.setAttribute("class", "project-title");
                        let d = odataMesh.odata.department;
                        let t = odataMesh.odata.title;
                        let an = odataMesh.odata.author;
                        if (!odataMesh.odata.department){
                            d = "DEPARTMENT";
                        }
                        if (!odataMesh.odata.title){
                            t = `Title${odataMesh.odata.index + 1}`;
                        }
                        if (!odataMesh.odata.author){
                            an = "Author Name";
                        }
                        projectTitle.innerHTML = 
                            `<h2>${d}</h2>
                            <h1>${t}</h1>
                            <h2>${an}<br>
                            ${odataMesh.odata.year}</h2>`;
                        const projectDescription = document.createElement("div");
                        projectDescription.setAttribute("class", "project-description");
                        if (odataMesh.odata.description) {
                            projectDescription.innerHTML = `<div>${odataMesh.odata.description}</div>`;
                        } else {
                            projectDescription.innerHTML = `<div>Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                            Donec in laoreet magna. Ut blandit quam a convallis pharetra. Curabitur volutpat tortor quis 
                            ligula tempor, at rutrum tellus consectetur. Vivamus quam felis, hendrerit ut euismod sit amet, 
                            finibus in urna. Morbi molestie elit mauris, scelerisque tempor diam lobortis nec. Nullam at nulla 
                            nibh. Morbi ut nisl congue, pulvinar justo ac, blandit orci. Proin vel lacus erat.</div>`;
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
                            const img = document.createElement("img");
                            img.src = "./Slide0.jpg";
                            img.setAttribute("class", "zoomInImg");
                            projectImg.appendChild(img);
                        }

                        const projVideo = document.createElement("div");
                        projVideo.setAttribute("class", "project-video");
                        if (odataMesh.odata.video){
                            console.log(odataMesh.odata.video);
                            const vid = document.createElement("iframe");
                            vid.src = odataMesh.odata.video;
                            vid.title = `${odataMesh.odata.title}_video`;
                            vid.setAttribute('allowFullScreen', '');
                            projVideo.appendChild(vid);
                        } else {
                            projVideo.style.paddingTop = 0;
                            projVideo.style.height = 0;
                        }

                        const projectFooter = document.createElement("div");
                        projectFooter.setAttribute("class", "project-footer");
                        if (odataMesh.odata.attachment){
                            odataMesh.odata.attachment.forEach(eachAttachment => {
                                const attachmentA = document.createElement("a");
                                attachmentA.setAttribute("class", "highlight customCursor");
                                // console.log(eachAttachment);
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
                        // document.body.appendChild(backicon);
                        projectDiv.appendChild(projectTitle);
                        projectDiv.appendChild(heroImgDiv);
                        projectDiv.appendChild(projectDescription);
                        projectDiv.appendChild(projectImg);
                        projectDiv.appendChild(projVideo);
                        projectDiv.appendChild(projectFooter);

                        // projectDiv.style.visibility = "visible";
                        projectDivTransIn();
                        projectDiv.scrollTop = 0;
                        setTimeout(function backiconVis() { backicon.style.visibility = "visible"; }, 1500);


                        projectDiv.addEventListener("click", (event) => {
                            event.preventDefault();
                            if (event.target.tagName != "IMG"){
                                projectDivTransOut();
                                projectDivShow = false;
                                backicon.style.visibility = "hidden";
                                return this.projDivShow = projectDivShow;
                            } 
                        });
                        backicon.addEventListener("click", () => {
                            projectDivTransOut();
                            projectDivShow = false;
                            backicon.style.visibility = "hidden";
                            return this.projDivShow = projectDivShow;
                        });                        
                        
                        const imgViewer = document.querySelector(".image-viewer");
                        const allImg = projectDiv.querySelectorAll(".zoomInImg");
                        allImg.forEach(eachImg => {
                            eachImg.addEventListener("click", (event) => {
                                imgViewer.style.display = "flex";
                                imgViewer.style.visibility = "visible";
                                // const img = imgViewer.querySelector("img");
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
                        return this.projDivShow = projectDivShow;
                    }
                    function projectDivTransIn(){
                        projectDiv.style.transition = "transform 1.5s ease-in-out";
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

    _animate() {
        const delta = this._clock.getDelta();
        requestAnimationFrame(this._animate.bind(this));
        if (this._renderer) {
            this._renderer.render(this._scene, this._camera);
        }
        if (this._controls) {
            this._controls.update(delta);
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
        const icon = document.getElementsByClassName("icon")[0];
        const view = document.getElementsByClassName("view")[0];
        let viewShow = false;
        // let blockerShow = true;

        const listWorks = document.querySelector("#works-list");
        const listOfWorksButton = document.querySelector("#listOfWorks");
        let showListWorks = false;
        const listWorksFocus = document.querySelectorAll(".listProject");


        const allWorks = document.getElementById("allWorks");
        const exhibitionHall = document.getElementById("exhibitionHall");
        const projectDiv = document.getElementById("projectDiv");
        const backicon = document.querySelector(".backicon");

        const aboutPg = document.getElementById("about-page");
        const about = document.getElementById("about");
        let showAboutPg = false;

        blocker.addEventListener("click", async () => {
            // blockerShow = false;
            blocker.style.visibility = "hidden";
            blocker.style.zIndex = "-1";
            await this._initHall(false);
            listOfWorksButton.style.visibility = "visible";
        });

        listOfWorksButton.addEventListener("click", (event) => {
            // console.log(this.projDivShow);
            showListWorks = !showListWorks;
            if (showListWorks){
                listofworksTransIn();
            } else {
                listofworksTransOut();
            }
            if (viewShow){
                transOutY(view);
                viewShow = false;
            }
        });

        this._options.container.addEventListener("click", () => {
            if (this.projDivShow == true && showListWorks == true) {
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
                        this._prevMesh = i;
                        listofworksTransOut();
                        showListWorks = false;
                        if (this.projDivShow == true) {
                            transOutY(projectDiv);
                            showListWorks = false;
                        }
                    }
                }
            });
        });

        about.addEventListener("click", () => {
            showAboutPg = true;
            transInY(aboutPg);
        });
        aboutPg.addEventListener("click", () => { 
            transOutY(aboutPg);
            showAboutPg = false;
        });

        icon.addEventListener('click', () => {
            listofworksTransOut();
            showListWorks = false;
            if (blocker.style.visibility == "hidden") {
                viewShow = !viewShow;
                // console.log(viewShow);
                if (viewShow) {
                    transInY(view);
                } else {
                    transOutY(view);
                    viewShow = false;
                }
            }
            if (showAboutPg == true){
                transOutY(aboutPg);
                showAboutPg = false;
            }
        });
        view.addEventListener("click", () => {
            listofworksTransOut();
            showListWorks = false
            viewShow = !viewShow;
            if (viewShow) {
                transInY(view);
            } else {
                transOutY(view);
                viewShow = false;
            }
        });

        exhibitionHall.addEventListener("click", () => {
            if (projectDiv) {
                transOutY(projectDiv);
            }
            if (backicon) {
                backicon.style.visibility = "hidden";
            }
            this._initHall(true);
        });
        allWorks.addEventListener("click", async () => {
            if (projectDiv) {
                transOutY(projectDiv);
            }
            if (backicon) {
                backicon.style.visibility = "hidden";
            }
            await this._backToAllWorks();
        });

        function transInY(element){
            element.style.transition = "transform 1.5s ease-in-out";
            element.style.transform = "translateY(0)";
        }
        function transOutY(element){
            element.style.transition = "transform 1s ease-in-out";
            element.style.transform = `translateY(-${element.getBoundingClientRect().height}px)`;
        }
        function listofworksTransIn(){
            listWorks.style.transition = "transform 1.5s ease-in-out";
            listWorks.style.transform = "translateX(0)";
        }
        function listofworksTransOut(){
            listWorks.style.transition = "transform 1.5s ease-in-out";
            listWorks.style.transform = `translateX(${listWorks.getBoundingClientRect().width}px)`;
        }
    }

    async _initHall(focusProject) {
        // console.log(this._projectGr);
        const maxSize = this._options.maxSize;
        this.camFollowMove = false;
        if (this.camFollowMove === false) {
            window.removeEventListener("pointermove", this._cammovefollow);
        }
        let refIndex;
        for (var i in this._projectGr) {
            // console.log(this._projectGr[i].odata.allworkPos, this._projectGr[i].odata.allworkPos.allworkRot);
            let indexI = this._projectGr[i].odata.index;
            // console.log(this._projectGr[i].odata.index, this._newPos[indexI]);
            this._projectGr[i].position.set(this._newPos[indexI].position.x * (maxSize - 1), this._newPos[indexI].position.y + (this._options.floorY + 2), - (this._newPos[indexI].position.z * (maxSize - 1)));
            this._projectGr[i].rotation.set(this._newPos[indexI].rotation.x, this._newPos[indexI].rotation.y, this._newPos[indexI].rotation.z);
            if (indexI == this._prevMesh && focusProject){
                refIndex = i;
            }
        }
        if (this._gridHelper === undefined){
            this._gridHelper = new THREE.GridHelper(100, 50, 0x808080, 0x808080);
            this._gridHelper.position.y = this._options.floorY;
            this._gridHelper.material.opacity = 0.3;
            this._gridHelper.material.depthWrite = false;
            this._gridHelper.material.transparent = true;
            this._scene.add(this._gridHelper);
            this._eventMeshes.push(this._gridHelper);
        }
        if (focusProject){
            await this._camLookAtExhibition(this._projectGr[refIndex].position, this._projectGr[refIndex].rotation, this._projectGr[refIndex]);
        } else {
            if (this._controls == null){
                this._controls = new CameraControls(this._camera, this._renderer.domElement);
                this._controls.maxDistance = this._options.controlMaxD;
                this._controls.minDistance = this._options.controlMinD;
                this._controls.distance = 2;
                this._controls.dollySpeed = 0.5;
                this._controls.azimuthRotateSpeed = 0.5;
                this._controls.polarRotateSpeed = 0.5;
                this._controls.dollyToCursor = true;
            } 
            if (this._controls) {
                this._controls.setLookAt(-20, this._options.floorY + this._options.cameraHeight*2, 0, 0, this._options.floorY, 0, true);
            }
        }
        // console.log(this._newPos, this._projectGr);
    }

    async _camLookAtExhibition(target, targetRot, t){
        if (this._controls){
            // this._lookatCameraSize = 1e-5;
            // const p = {x: target.x, y: this._options.floorY + this._options.cameraHeight, z: target.z};
            // const l = target;
            // const lookat = new THREE.Vector3(p.x, p.y, p.z).lerp(new THREE.Vector3(l.x, l.y, l.z), this._lookatCameraSize);
            // this._controls.setLookAt(p.x, p.y, p.z, lookat.x, lookat.y, lookat.z, true);
            // this._controls.rotateAzimuthTo(targetRot.y, true);
            this._controls.fitToBox(t, true, {paddingTop: 0.5, paddingRight: 0.5, paddingBottom: 0.5, paddingLeft: 0.5});
            this._controls.rotateAzimuthTo(targetRot.y, true);
        }
    }

   async  _backToAllWorks() {
        if (this._controls){
            this._controls.reset(true);
        }
        this._projectGr.forEach(eachProj => {
            // console.log("AllWorksLayout:", eachProj.odata.index, eachProj.odata.allworkPos, this._projectGr[i].odata.allworkPos.allworkRot);
            eachProj.position.set(eachProj.odata.allworkPos.x, eachProj.odata.allworkPos.y, eachProj.odata.allworkPos.z);
            eachProj.rotation.set(eachProj.odata.allworkRot.x, eachProj.odata.allworkRot.y, eachProj.odata.allworkRot.z);
            eachProj.scale.set(1, 1, 1);
        });
        await this._camMoveLookatAnim({x:0, y:0, z:0});
    }
   async  _camMoveLookatAnim(target) {
        // console.log(target);
        if (window.innerWidth / window.innerHeight > 1) {
            this._camera.position.set(this._options.cameraPosition.x, this._options.cameraPosition.y, this._options.cameraPosition.z);
        } else if (window.innerWidth / window.innerHeight <= 1) {
            this._camera.position.set(this._options.cameraPosition.x, this._options.cameraPosition.y, this._options.cameraPosition.z + 12);
        }
        if (this._controls) {
            this._controls.setLookAt(this._camera.position.x, this._camera.position.y, this._camera.position.z, target.x, target.y, target.z, true);
        }
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
            layerS = this._options.projectDistance - 1;
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
        const offsetX = ((posData.layerSize - 1) * posData.d) / 2;
        const offsetY = (Math.ceil(posData.num - 1) * maxSize) / 2;
        let counter = 0;
        items.forEach(async (item) => {
            //add project items to canvas
            let { index, department, title, author, type, year, description, heroImg, img, video, link, email, socialMedia, orientation, attachment, allworkPos, allworkRot } = item;
            //create project plane
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            //check image exist
            if (heroImg) {
                //add project frame + texture img
                const texture = await textureLoader.loadAsync(heroImg[1]);
                // console.log("texture", texture);
                const prevWidth = texture.image.width;
                const prevHeight = texture.image.height;
                if (prevWidth > maxSize) {
                    if (prevWidth / prevHeight > 1) {
                        width = maxSize;
                        height = (prevHeight / prevWidth) * width;
                    } else if (prevWidth / prevHeight < 1) {
                        height = maxSize;
                        width = (prevWidth / prevHeight) * height;
                    } else  if (prevWidth / prevHeight ==  1){
                        height = 0.7 * maxSize;
                        width = height;
                    }
                } else {
                    width = maxSize;
                    height = (prevHeight / prevWidth) * width;
                }
                material.map = texture;
            } else {
                material.map = null;
            }
            const geometry = new THREE.BoxGeometry(width, height, this._options.depth);
            const plane = new THREE.Mesh(geometry, material);
            const layerNum = Math.floor(index / posData.layerSize);
            const layerPos = index % posData.layerSize;
            // console.log(`index: ${index}, layerNum: ${Math.floor(index / posData.layerSize)}, layerPos: ${layerPos}`);
            pos.x = layerPos * posData.d - offsetX;
            pos.y = offsetY - layerNum * maxSize;
            // console.log(`index: ${index}, layerNum: ${layerNum}, layerPos: ${layerPos}, posX: ${pos.x}, posZ: ${pos.z}`);
            plane.position.set(pos.x, pos.y, pos.z);
            item.allworkPos = {x: plane.position.x, y: plane.position.y, z: plane.position.z};
            // console.log("allworks", index, pos);
            if (orientation == "vertical"){
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
        const MUD = document.createElement("div");
        const MUDTitle = document.createElement("h1");
        MUDTitle.innerHTML = "MUD";
        MUD.appendChild(MUDTitle);
        const MUP = document.createElement("div");
        const MUPTitle = document.createElement("h1");
        MUPTitle.innerHTML = "MUP";
        MUP.appendChild(MUPTitle);
        const MUDT = document.createElement("div");
        const MUDTTitle = document.createElement("h1");
        MUDTTitle.innerHTML = "MUDT";
        MUDT.appendChild(MUDTTitle);
        const BAUS = document.createElement("div");
        const BAUSTitle = document.createElement("h1");
        BAUSTitle.innerHTML = "BAUS";
        BAUS.appendChild(BAUSTitle);
        listWorks.appendChild(MUD);
        listWorks.appendChild(MUP);
        listWorks.appendChild(MUDT);
        listWorks.appendChild(BAUS);
        data.forEach(d => {
            const projectIndex = document.createElement("li");
            const department = document.createElement("li");
            const title = document.createElement("li");
            title.setAttribute("id", d.index);
            title.setAttribute("class", "listProject highlight customCursor");
            const author = document.createElement("li");
            projectIndex.innerText = d.index + 1;
            department.innerText = d.department;
            title.innerText = d.title;
            author.innerText = d.author;
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
            else if (d.department == "BAUS"){
                BAUS.appendChild(projectIndex);
                BAUS.appendChild(title);
                BAUS.appendChild(author);
            }
        });
    }

    //about page
    async loadAboutPage(items) {
        const aboutPg = document.getElementById("about-page");
        items.forEach((item) => {
            const div = document.createElement("div");
            const abbrevDiv = document.createElement("div");
            const majorDiv = document.createElement("div");
            const aboutDiv = document.createElement("div");
            const linkDiv = document.createElement("a");
            linkDiv.setAttribute("class", "highlight customCursor");

            abbrevDiv.innerHTML = item.Abbreviation;
            majorDiv.innerHTML = item.Major;
            aboutDiv.innerHTML = item.About;
            linkDiv.href = item.Link;
            linkDiv.innerText = item.Link;
            linkDiv.target = "_blank";

            div.appendChild(abbrevDiv);
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
        this._eventMeshes.push(gltf.scene);
        this._scene.add(gltf.scene);
        // console.log(gltf.scene);
        console.log("Hall Loaded");
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