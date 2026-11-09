import { createInterestAccount } from './account';
import { interestStore } from './store';

const account = createInterestAccount(interestStore, (...args) => fetch(...args));

export const checkInterestAccount = account.check;
export const mergeInterestsIntoAccount = account.merge;
export const forgetInterestsEverywhere = account.forgetEverywhere;
