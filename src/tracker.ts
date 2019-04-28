import { Client } from 'pg';
import { writeFileSync } from "fs";
import { statRequest } from './sql/stats'

class Tracker {
    pg: Client;

    constructor() {
        this.pg = new Client({
            database: "poker_tracker",
            password: "lapin",
            user: "postgres",
        })
    }

    async init() {
        await this.pg.connect();
    }

    private async request(query: string, values?: any[]) {
        const res = await this.pg.query({
            text: query,
            rowMode: 'array',
            values
        });
        return res.rows;
    }

    public async getHandById(id: number) {
        const chien = await this.request(`SELECT history FROM cash_hand_histories WHERE id_hand = ${id}`);
        console.log(chien)
    }

    public async getPlayerStat(playerName: string) {
        const raw: any = {};
        const [res] = await this.request(statRequest.request(playerName))
        res.forEach((item, index) => {
            raw[statRequest.keys[index]] = item;
        })
        const stats = {
            vpip: raw.cnt_vpip / (raw.cnt_hands - raw.cnt_walks) * 100,
            pfr: raw.cnt_pfr / (raw.cnt_hands - raw.cnt_walks) * 100,
            bet3_pf: ((raw.cnt_p_3bet / raw.cnt_p_3bet_opp) * 100),
        }
        return stats
    }
}


if (require.main === module) {
    (async () => {
        const chien = new Tracker()
        await chien.init();
        const lapin = await chien.getPlayerStat('audrey92140');
    })()
}

export default new Tracker()
