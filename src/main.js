import './style.scss';
import VRHall from './vr-hall';
import Airtable from './AirtableApi';

import WebGL from 'three/examples/jsm/capabilities/WebGL.js'

const base = Airtable.base('appnT8AdZYp6l5cvZ');
const tableId = "tbltuGr4Lopc6Ur38";
const aboutTableId = "tbl1PbgTU4UskKhjv";

async function getAboutData(tableName) {
  const aboutData = [];
  const records = await base(tableName).select({
    sort: [{ field: "Index", direction: "asc" }],
  }).all();
  records.forEach((record) => {
    aboutData.push(record.fields);
  });
  return aboutData;
}

async function getData(tableName) {
  const projectData = [];
  const records = await base(tableName).select({
    sort: [{ field: "index", direction: "asc" }],
    // maxRecords: 10
  }).all();
  for (var i in records) {
    const data = records[i].fields;
    if (data.heroImage) {
      projectData.push({
        index: data.index,
        department: data.department,
        title: data.title,
        author: data.author,
        type: data.type,
        year: data.year,
        description: data.description,
        heroImg: [data.heroImage[0].url, data.heroImage[0].thumbnails.large.url],
        img: [],
        video: data.video,
        link: data.link,
        email: data.email,
        socialMedia: data.socialMedia,
        orientation: data.orientation,
        attachment: []
      });
    } else {
      projectData.push({
        index: data.index,
        department: data.department,
        title: data.title,
        author: data.author,
        department: data.department,
        type: data.type,
        year: data.year,
        description: data.description,
        heroImg: null,
        img: [],
        video: data.video,
        link: data.link,
        email: data.email,
        socialMedia: data.socialMedia,
        orientation: data.orientation,
        attachment: []
      });
    }
    for (var j in data.image) {
      if (data.image[j].url) {
        projectData[i].img.push([data.image[j].filename, data.image[j].url]);
        // console.log(projectData[i]);
      } else {
        projectData[i].img = null;
      }
    }
    for (var k in data.attachment){
      if (data.attachment[k].url){
        projectData[i].attachment.push([data.attachment[k].filename, data.attachment[k].url]);
      } else {
        projectData[i].attachment = null;
      }
    }
  }
  return projectData;
}

document.body.addEventListener('load', function(e){ e.preventDefault(); });

let blocker = document.getElementById("blocker");

let loader = document.getElementById("loader");
if (WebGL.isWebGL2Available()) {
  // Initiate three.js function when WebGL available
  main();
  blocker.style.visibility = "visible";
} else {
  blockerShow = false;
  const warning = WebGL.getWebGL2ErrorMessage();
  console.log(warning.innerText);

  fade(loader, "1s", "3s", "forwards", callback);

  let rootContainer = document.getElementById('root');
  let warningText = document.createElement("h1");
  warningText.innerHTML = `<h4>${warning.innerText}</h4>`;
  warningText.style.width = "100%";
  warningText.style.textAlign = "center";
  rootContainer.appendChild(warningText);
  rootContainer.style.display = "flex";
  rootContainer.style.flexDirection = "row";
  rootContainer.style.alignItems = "center";
}

async function fade(element, animeDur, animDelayT, animDirection, callback) {
  element.style.animationName = "fade";
  element.style.animationDuration = animeDur;
  element.style.animationDelay= animDelayT;
  element.style.animationTimingFunction = "ease-in-out";
  element.style.animationIterationCount = 1;
  element.style.animationFillMode = animDirection;
  setTimeout(function () { callback(element) }, 1000);
}
function callback(element){
    element.style.visibility = "hidden";
}


async function main() {
  const vr = new VRHall({
    debugger: false,
    modelloaded: false,
    camMoveFollowState: true,
    lightStrength: 1,
    maxSize: 4,
    depth: 0.03,
    cameraHeight: 2.2,
    floorY: -10,
    floorName: "GridHelper",
    cameraPosition: { x: 0, y: 0, z: 18 },
    cameraRotation: { x: 0, y: 0, z: 0 },
    controlMaxD: 10,
    controlMinD: 1,
    projectDistance: 5,
    layerProjectNum: 8,
    container: document.getElementById("root"),
  });

  //call load items from Airtable data
  await getData(tableId)
    .then((res) => {
      // console.log("Data retrived", res);
      console.log("item data retrived DONE");
      vr.loadItems(res);
    }).catch((err) => {
      console.log("ERR: ", err)
    });

  //load gallery model
  await vr.loadHall({
    url: "./exhibition-frame",
    position: { x: 0, y: -10, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 3,
    onprogress: (p) => {
      console.log(p);
    },
  });

  await getAboutData(aboutTableId)
  .then((res) => {
    // console.log("Data retrived", res);
    console.log("About page data retrived DONE");
    vr.loadAboutPage(res);
  }).catch((err) => {
    console.log("ERR: ", err)
  });
}

//bg gradient
bgGradient();
function bgGradient() {
  let curX = 0;
  let curY = 0;
  let tgX = 0;
  let tgY = 0;

  const interBubble = document.querySelector(".interactive");
  window.addEventListener('pointermove', (event) => {
    tgX = event.clientX;
    tgY = event.clientY;
  });
  function move() {
    curX += (tgX - curX) / 20;
    curY += (tgY - curY) / 20;
    interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
    requestAnimationFrame(() => {
      move();
    });
  }
  move();
}