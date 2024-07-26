import Airtable from './AirtableApi';

const base = Airtable.base('appnT8AdZYp6l5cvZ');
const newPosId = 'tblDK9ZzFk2fIcGWb';

let newPosd = [];

async function getNewPos(tableName) {
    const newPosData = [];
    const records = await base(tableName).select({
        sort: [{ field: "index", direction: "asc" }],
    }).all();
    records.forEach((record) => {
        let r = record.fields;
        newPosData.push({
            index: r.index,
            department: r.department,
            position: { x: r.posX, y: r.posY, z: r.posZ },
            rotation: { x: (r.rotX / 360) * Math.PI * 2, y: (r.rotY / 360) * Math.PI * 2, z: (r.rotZ / 360) * Math.PI * 2 },
            scale: { x: r.scale, y: r.scale, z: r.scale }
        });
    });
    return newPosData;
}

await getNewPos(newPosId)
.then((res) => {
  console.log("pos data retrived DONE");
  newPosd = res;
//   console.log(res);
}).catch((err) => {
  console.log("ERR: ", err)
});

export const newPos = newPosd;

/* 
  MUD 34*2 = 68
  MUP 2*2 = 4
  MUDT 5*2 = 10
  MUA 4*2 = 8
  BAUS 10*2 = 20
  Other Unique 3*2 = 6
  
  TOTAL 68+4+10+8+20+6 = 116 boards
*/


// export const newPos = [
//     //MUD 20-30 5+3+4+3+4+4+1 = 24
//     {
//         index: 0,
//         department: "MUD",
//         position: { x: -14.267 , y: 0, z: -3.8829 },
//         rotation: { x: 0, y: (70/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 1,
//         department: "MUD",
//         position: { x: -13.754 , y: 0, z: -2.4734 },
//         rotation: { x: 0, y: (70/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 2,
//         department: "MUD",
//         position: { x: -13.241, y: 0, z: -1.0638 },
//         rotation: { x: 0, y: (70/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 3,
//         department: "MUD",
//         position: { x: -12.694, y: 0, z: 0.4379 },
//         rotation: { x: 0, y: (70/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 4,
//         department: "MUD",
//         position: { x: -12.181, y: 0, z: 1.8493 },
//         rotation: { x: 0, y: (70/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 5,
//         department: "MUD",
//         position: { x: -10.5134, y: 0, z: -2.99759 },
//         rotation: { x: 0, y: (105/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 6,
//         department: "MUD",
//         position: { x: -10.9016, y: 0, z: -1.5487 },
//         rotation: { x: 0, y: (105/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     // {
//     //     index: 7,
//     //     department: "MUD",
//     //     position: { x: -8.10143, y: 0, z: -2.30445 },
//     //     rotation: { x: 0, y: (105/360)*Math.PI*2, z: 0 },
//     //     scale: { x: 1, y: 1, z: 1 }
//     // },
//     {
//         index: 7,
//         department: "MUD",
//         position: { x: -0.951623, y: 0, z: -3.55687 },
//         rotation: { x: 0, y: (167/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 8,
//         department: "MUD",
//         position: { x: -2.41318, y: 0, z: -3.21944 },
//         rotation: { x: 0, y: (167/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 9,
//         department: "MUD",
//         position: { x: -3.87474, y: 0, z: -2.88201 },
//         rotation: { x: 0, y: (167/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 10,
//         department: "MUD",
//         position: { x: -5.33629, y: 0, z: -2.54459 },
//         rotation: { x: 0, y: (167/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 11,
//         department: "MUD",
//         position: { x: 0.673712, y: 0, z: -3.03665 },
//         rotation: { x: 0, y: (43/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 12,
//         department: "MUD",
//         position: { x: 1.77075, y: 0, z: -2.01365 },
//         rotation: { x: 0, y: (43/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 13,
//         department: "MUD",
//         position: { x: 2.86778, y: 0, z: -0.99065 },
//         rotation: { x: 0, y: (43/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 14,
//         department: "MUD",
//         position: { x: -1.84067, y: 0, z: 1.85337 },
//         rotation: { x: 0, y: (76/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 15,
//         department: "MUD",
//         position: { x: -1.47779, y: 0, z: 3.30882 },
//         rotation: { x: 0, y: (76/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 16,
//         department: "MUD",
//         position: { x: -1.11491, y: 0, z: 4.76426 },
//         rotation: { x: 0, y: (76/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 17,
//         department: "MUD",
//         position: { x: -0.752016, y: 0, z: 6.21971 },
//         rotation: { x: 0, y: (76/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 18,
//         department: "MUD",
//         position: { x: -4.84235, y: 0, z: 4.11529 },
//         rotation: { x: 0, y: (13/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 19,
//         department: "MUD",
//         position: { x: -6.3039, y: 0, z: 3.77787 },
//         rotation: { x: 0, y: (13/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 20,
//         department: "MUD",
//         position: { x: -7.75571, y: 0, z: 3.44269 },
//         rotation: { x: 0, y: (13/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 21,
//         position: { x: -9.22701, y: 0, z: 3.10301 },
//         rotation: { x: 0, y: (13/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 22,
//         department: "MUD",
//         position: { x: -10.6886, y: 0, z: 2.76558 },
//         rotation: { x: 0, y: (13/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 23,
//         department: "MUD",
//         position: { x: -8.10143, y: 0, z: -2.30445 },
//         rotation: { x: 0, y: (105/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     //MUP 5 = 3 + 2 && 1 extra 
//     {
//         index: 24,
//         department: "MUP",
//         position: { x: 6.49574, y: 0, z: 2.39247 },
//         rotation: { x: 0, y: (43/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 25,
//         department: "MUP",
//         position: { x: 7.59277, y: 0, z: 3.41547 },
//         rotation: { x: 0, y: (43/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 26,
//         department: "MUP",
//         position: { x: 8.6898, y: 0, z: 4.43847 },
//         rotation: { x: 0, y: (43/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 27,
//         department: "MUP",
//         position: { x: 11.5205, y: 0, z: 2.02387  },
//         rotation: { x: 0, y: (90/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 28,
//         department: "MUP",
//         position: { x: 11.5205, y: 0, z: 3.52387 },
//         rotation: { x: 0, y: (90/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     //MUDT 6 3+3
//     {
//         index: 29,
//         department: "MUDT",
//         position: { x: 3.60827, y: 0, z: -4.05114 },
//         rotation: { x: 0, y: (60/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 30,
//         department: "MUDT",
//         position: { x: 4.35827, y: 0, z: -2.7521 },
//         rotation: { x: 0, y: (60/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 31,
//         department: "MUDT",
//         position: { x: 5.10827, y: 0, z: -1.45306 },
//         rotation: { x: 0, y: (60/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 32,
//         department: "MUDT",
//         position: { x: 6.23494, y: 0, z: -4.65401 },
//         rotation: { x: 0, y: (50/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 33,
//         department: "MUDT",
//         position: { x: 7.19912, y: 0, z: -3.50494 },
//         rotation: { x: 0, y: (50/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 34,
//         department: "MUDT",
//         position: { x: 8.1633, y: 0, z: -2.35588 },
//         rotation: { x: 0, y: (50/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     //BAUS 5
//     {
//         index: 35,
//         department: "BAUS",
//         position: { x: 16, y: 0, z: -4 },
//         rotation: { x: 0, y: (90/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 36,
//         department: "BAUS",
//         position: { x: 16, y: 0, z: -2.5 },
//         rotation: { x: 0, y: (90/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 37,
//         department: "BAUS",
//         position: { x: 16, y: 0, z: -1 },
//         rotation: { x: 0, y: (90/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 38,
//         department: "BAUS",
//         position: { x: 16, y: 0, z: 0.5 },
//         rotation: { x: 0, y: (90/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
//     {
//         index: 39,
//         department: "BAUS",
//         position: { x: 16, y: 0, z: 2 },
//         rotation: { x: 0, y: (90/360)*Math.PI*2, z: 0 },
//         scale: { x: 1, y: 1, z: 1 }
//     },
// ];