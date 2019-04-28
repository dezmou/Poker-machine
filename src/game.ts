import tracker from "./tracker";

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

interface Player {
  name: string;
  chips: number;
  folded?: boolean;
}

interface Action {
  type: ACTION_TYPE;
  amount?: number;
  player?: Player;
}

export class Game {
  step = STEP.BEFORE;
  players: Player[] = [];
  plIndex = -1;
  button = 0;
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
    if (this.players[this.plIndex].folded) {
      this.nextPlayer();
    }
  }

  addPlayer(player: Player) {
    this.players.push(player)
    console.log("New Player : ", player);
  }

  playAction(action: Action) {
    const player = this.players[this.plIndex];
    console.log("New Action : ", player.name, action.type, action.amount ? action.amount : "");
    if (action.type === ACTION_TYPE.ACTION_FOLD){
      player.folded = true;
    }
    this.nextPlayer();
  }

  nextStep() {
    this.step++;
    if (this.step > STEP.SUMMARY) {
      throw new Error("Invalide Step")
    }
    console.log(this.step);
    if (this.step === STEP.BLINDS){
      this.nextPlayer();
    }
    if (this.step > STEP.PREFLOP && this.step < STEP.SUMMARY) {
      this.plIndex = -1;
      this.nextPlayer();
    }
  }
}

export class WinamaxGame extends Game {
  history: string;
  constructor(history: string) {
    super()
    this.history = history;
    console.log(history);
    this.parseHistory();
  }

  async parseHistory() {
    for (const line of this.history.split("\n")) {
      if (this.step === STEP.BEFORE) {
        if (line.endsWith(" is the button")) {
          this.button = parseFloat(line.split("#")[1].replace(" is the button", "")) - 1;
        } else if (line.startsWith("Seat ")) {
          this.addPlayer({
            name: line.split(":")[1].split("(")[0].trim(),
            chips: parseFloat(line.split("(")[1].split(")")[0].replace("€", "")),
          })
          continue;
        }
      } else if (this.step === STEP.BLINDS) {
        if (line.indexOf(' posts small blind ') !== -1) {
          const sp = line.split(" ")
          this.playAction({
            type: ACTION_TYPE.ACTION_SB,
            amount: parseFloat(sp[sp.length - 1].replace("€", ""))
          })
          continue;
        } else if (line.indexOf(' posts big blind ') !== -1) {
          const sp = line.split(" ")
          this.playAction({
            type: ACTION_TYPE.ACTION_BB,
            amount: parseFloat(sp[sp.length - 1].replace("€", ""))
          })
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
        this.nextStep();
      } else if (line.startsWith("*** PRE-FLOP ***")) {
        this.nextStep();
      } else if (line.startsWith("*** FLOP ***")) {
        this.nextStep();
      } else if (line.startsWith("*** TURN ***")) {
        this.nextStep();
      } else if (line.startsWith("*** RIVER ***")) {
        this.nextStep();
      } else if (line.startsWith("*** SHOW DOWN  ***")) {
        this.nextStep();
      }
    }
  }
}