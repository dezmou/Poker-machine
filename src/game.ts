import tracker from "./tracker";

const rd = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

enum STEP {
  BEFORE = 0,
  BLINDS = 1,
  PREFLOP = 2,
  FLOP = 3,
  TURN = 4,
  RIVER = 5,
  SUMMARY = 6,
}

enum ACTION_TYPE {
  ACTION_SB = 0,
  ACTION_BB = 1,
  ACTION_FOLD = 2,
  ACTION_CALL = 3,
  ACTION_RAISE = 4,
}

interface SimplePlayer {
  name: string;
  chips: number;
  seatNumber: number;
}

interface Player {
  name: string;
  chips: number;
  folded: boolean;
  chipsEngaged: number;
  allin: boolean;
  seatNumber: number;
}

interface Action {
  type: ACTION_TYPE;
  amount?: number;
  player?: Player;
}

const precision = (nbr: number) => {
  const factor = Math.pow(10, 2);
  return Math.round(nbr * factor) / factor;
}

export class Game {
  step = STEP.BEFORE;
  players: Player[] = [];
  playersByName: { [key: string]: Player } = {};
  plIndex = -1;
  button = 0;
  board: string[] = [];
  rake = 0;
  totalPot = 0;
  amountToCall = 0;
  bb = 0.2;
  sb = 0.1;
  ended = false;
  constructor() {

  }

  private nextPlayer() {
    if (this.plIndex === -1) {
      this.plIndex = this.button + 1;
    } else {
      this.plIndex++;
    }
    if (this.plIndex > this.players.length - 1) {
      this.plIndex = 0;
    }
    if (this.players[this.plIndex].folded || this.players[this.plIndex].allin) {
      this.nextPlayer();
    }
    // if (this.players.length === 2) {
    //   this.nextPlayer();
    // }
  }

  addPlayer(simplePlayer: SimplePlayer) {
    const player = {
      ...simplePlayer,
      folded: false,
      chipsEngaged: 0,
      allin: false,
    }
    this.players.push(player)
    // if (simplePlayer.button) {
    //   this.button = this.players.length - 1;
    // }
    this.playersByName[player.name] = player;
  }

  playDeadBlind(playerName: string, amount: number) {
    // console.log("dead ", amount, playerName);
    const player = this.playersByName[playerName]
    if (player.chips < amount) {
      amount = player.chips;
      player.allin = true;
    }
    if (amount !== this.sb) {
      player.chipsEngaged += amount;
    }
    this.totalPot += amount;
    player.chips += -amount;
  }

  endGame() {
    this.ended = true;
  }

  playAction(action: Action) {
    const player = this.players[this.plIndex];
    if (action.type === ACTION_TYPE.ACTION_FOLD) {
      player.folded = true;
    }
    if (action.type === ACTION_TYPE.ACTION_CALL) {
      action.amount = this.amountToCall;
    }
    if (action.amount) {
      // console.log("player : ", player.name);
      // console.log("chips engaged", player.chipsEngaged);
      let netAmount = action.amount - player.chipsEngaged;
      // console.log("Player chips : ", precision(player.chips), "net amount : ", netAmount);
      if (precision(player.chips) <= netAmount) {
        player.allin = true;
        netAmount = player.chips;
        // console.log("is allin ", netAmount);
      }
      if (netAmount > 0) {
        this.totalPot += precision(netAmount);
      }
      player.chips += -netAmount;
      // console.log(player.name, " chips left : ", player.chips);
      this.amountToCall = this.amountToCall < action.amount ? action.amount : this.amountToCall;
      player.chipsEngaged = action.amount;
      // console.log("add to pot : ", netAmount);
      // console.log("");
    }
    let alive = false
    for (let player of this.players) {
      if (!player.allin && !player.folded) {
        alive = true;
        break;
      }
    }
    if (!alive) {
      return this.endGame();
    }
    this.nextPlayer();
  }

  nextStep() {
    if (!this.ended) {
      this.step++;
      if (this.step > STEP.SUMMARY) {
        throw new Error("Invalide Step")
      }
      if (this.step === STEP.BLINDS) {
        // console.log("table size : ", this.players.length);
        this.nextPlayer();
      }
      if (this.step > STEP.PREFLOP && this.step < STEP.SUMMARY) {
        this.plIndex = -1;
        this.amountToCall = 0;
        this.nextPlayer();
        this.players.forEach(player => {
          player.chipsEngaged = 0;
        })
      }
    }
    if (this.step === STEP.BLINDS && this.players.length === 2) {
      this.nextPlayer();
    }
  }
}

export class WinamaxGame extends Game {
  history: string;
  wina_pot: number = 0;
  constructor(history: string) {
    super()
    this.history = history;
    // console.log('\n\n\n\n\n');
    this.parseHistory();
  }

  compare():number {
    if (precision(this.totalPot) !== precision(this.wina_pot)) {
      // console.log("bot : ", precision(this.totalPot), "\nwina : ", precision(this.wina_pot));
      // await new Promise(resolve => rd.question(`pot error`, resolve))
      return 1
    }
    return 0
  }

  checkIfPlayerPlay(name: string) {
    return (this.history.split("*** PRE-FLOP ***")[1].indexOf(name) !== -1)
  }

  findButton(button: number): number {
    let more = 0;
    for (let y = 0; y < 22; y++) {
      let i = -1;
      for (let player of this.players) {
        i++;
        const player = this.players[i]
        if (button - more === player.seatNumber) {
          // console.log("BUTTON : ", player.name);
          return i
        }
      }
      more++;
      if (y === 11) {
        more = -11;
      }
    }
    throw new Error("Button not found....")
  }

  parseHistory() {
    let button = -30;
    for (let line of this.history.split("\n")) {
      // console.log("    ~~>", line);
      line = line.replace(" and is all-in", "");
      if (this.step === STEP.BEFORE) {
        if (line.endsWith(" is the button")) {
          button = parseInt(line.split("#")[1].replace(" is the button", ""));
        } else if (line.startsWith("Seat ")) {
          const name = line.split(":")[1].split("(")[0].trim()
          if (this.checkIfPlayerPlay(name)) {
            const seatNumber = parseInt(line.charAt(5))
            this.addPlayer({
              name,
              chips: parseFloat(line.split("(")[1].split(")")[0].replace("€", "")),
              seatNumber: seatNumber,
            })
          }
          continue;
        }
      } else if (this.step === STEP.BLINDS) {
        if (line.indexOf(' posts small blind ') !== -1) {
          if (line.endsWith(' out of position')) {
            this.playDeadBlind(line.split(" posts small blind ")[0], this.sb);
          } else {
            const sp = line.split(" ")
            this.playAction({
              type: ACTION_TYPE.ACTION_SB,
              amount: parseFloat(sp[sp.length - 1].replace("€", ""))
            })
          }
          continue;
        } else if (line.indexOf(' posts big blind ') !== -1) {
          if (line.endsWith(' out of position')) {
            this.playDeadBlind(line.split(" posts big blind ")[0], this.bb);
          } else {
            const sp = line.split(" ")
            this.playAction({
              type: ACTION_TYPE.ACTION_BB,
              amount: parseFloat(sp[sp.length - 1].replace("€", ""))
            })
          }
          continue;
        }
      } else if (this.step > STEP.BLINDS && this.step < STEP.SUMMARY) {
        if (line.endsWith(" checks")) {
          this.playAction({ type: ACTION_TYPE.ACTION_CALL })
          continue;
        } else if (line.endsWith(" folds")) {
          this.playAction({ type: ACTION_TYPE.ACTION_FOLD })
          continue;
        } else if (line.indexOf(" calls ") !== -1) {
          this.playAction({
            type: ACTION_TYPE.ACTION_CALL,
          })
          continue;
        } else if (line.indexOf(" raises ") !== -1) {
          const sp = line.split(" ");
          this.playAction({
            type: ACTION_TYPE.ACTION_RAISE,
            amount: parseFloat(sp[sp.length - 1].replace("€", ""))
          })
          continue;
        } else if (line.indexOf(" bets ") !== -1) {
          const sp = line.split(" ");
          this.playAction({
            type: ACTION_TYPE.ACTION_RAISE,
            amount: parseFloat(sp[sp.length - 1].replace("€", ""))
          })
          continue;
        }
      }
      if (line.startsWith("*** ANTE/BLINDS ***")) {
        this.button = this.findButton(button);
        this.nextStep();
      } else if (line.startsWith("*** PRE-FLOP ***")) {
        this.nextStep();
      } else if (line.startsWith("*** FLOP ***")) {
        line.split("[")[1].split("]")[0].split(" ").forEach((card) => this.board.push(card))
        this.nextStep();
      } else if (line.startsWith("*** TURN ***")) {
        this.board.push(line.split("[")[2].split("]")[0])
        this.nextStep();
      } else if (line.startsWith("*** RIVER ***")) {
        this.board.push(line.split("[")[2].split("]")[0])
        this.nextStep();
      } else if (line.startsWith("*** SHOW DOWN  ***")) {
        this.nextStep();
      } else if (line.indexOf("Total pot ") !== -1) {
        if (line.indexOf(" | Rake ") !== -1) {
          this.rake = parseFloat(line.split("| Rake ")[1].replace("€", ""))
        } else {
          this.rake = 0;
        }
        this.wina_pot = (parseFloat(line.split(" ")[2].replace("€", "")) + this.rake);
      }
    }
  }
}