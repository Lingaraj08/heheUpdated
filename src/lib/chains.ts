import { defineChain } from "thirdweb/chains";
import { baseSepolia } from "thirdweb/chains";
import { zkSyncSepolia } from "thirdweb/chains";

const flow = defineChain(545);
const ink = defineChain(763373);


  
export const selectedChain = {
    ...zkSyncSepolia,
    rpc: [process.env.BASE_RPC_URL || "https://zksync-sepolia.g.alchemy.com/v2/7EYcBZaCvigQrIMXAL4AcdB0mPs7soN8"], // Add your RPC URL here
};
// export const selectedChain = zkSyncSepolia;
// export const selectedChain = flow;
// export const selectedChain = ink;