import tracker from "./tracker";
import { Game, WinamaxGame } from "./game";

(async () => {
  await tracker.init()

  // const chien = await tracker.getHandById(256659);
  // const zouze = new WinamaxGame(chien);
  // await zouze.compare()

  let errors = 0;
  let total = 0
  for (let i = 16459; i < 1000000; i++) {
    const id = 0 + i
    // console.log("id : ", id);
    const chien = await tracker.getHandById(id);
    const zouze = new WinamaxGame(chien);
    errors += zouze.compare()
    total++;
    console.log("total : ", total, " errors : ", errors);
  }
})()