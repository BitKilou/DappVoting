const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect, assert } = require('chai');
const Voting = artifacts.require('Voting');

contract('Voting', accounts => {
    let owner = accounts[0];
    let sender = accounts[1];
    let receiver = accounts[2];

    beforeEach(async () => {
        this.votingInstance = await Voting.new({from: owner});
    });

    it('Should deploy contract properly', () => {
        assert(votingInstance.address !== '');
    });
});