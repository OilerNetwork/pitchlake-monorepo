import { auctionEndTests, auctionOpenTests, auctionStartTests, exerciseOptions, optionSettle, refundTokenizeBids, } from "./smokeTest1";
async function smokeTesting(testRunner) {
    await auctionOpenTests(testRunner);
    await auctionStartTests(testRunner);
    await auctionEndTests(testRunner);
    await refundTokenizeBids(testRunner);
    await optionSettle(testRunner);
    await exerciseOptions(testRunner);
}
export { smokeTesting };
