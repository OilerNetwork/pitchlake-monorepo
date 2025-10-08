import {
  auctionEndTests,
  auctionOpenTests,
  auctionStartTests,
  exerciseOptions,
  optionSettle,
  refundTokenizeBids,
} from "./smokeTest1";
import { TestRunner } from "../utils/facades/TestRunner";
async function smokeTesting(testRunner: TestRunner) {
  await auctionOpenTests(testRunner);
  await auctionStartTests(testRunner);
  await auctionEndTests(testRunner);
  await refundTokenizeBids(testRunner);
  await optionSettle(testRunner);
  await exerciseOptions(testRunner);
}

export { smokeTesting };
