const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect, assert } = require('chai');
const Voting = artifacts.require('Voting');

contract('Voting', accounts => {
    let owner = accounts[0];
    let sender = accounts[1];
    let receiver = accounts[2];

     beforeEach(async function () {
        this.votingInstance = await Voting.new({from: owner});
    });

    contract('Tally votes', function() {
        it('Should send an event when votes are tallied', async function () {
            await this.votingInstance.startProposalsRegistration();
            await this.votingInstance.endProposalsRegistration();
            await this.votingInstance.startVotingSession();
            await this.votingInstance.endVotingSession();
            expectEvent(await this.votingInstance.tallyVotes(), 'VotesTallied');
        });

        it('Should revert if workflow not respected', async function () {
            await expectRevert(this.votingInstance.tallyVotes(), 'Worflow not respected');
        });
    });

    contract('RegisteringVoters', () => {

        it('Should add an address to our whiteList', async function () {
            await this.votingInstance.addToWhitelist(sender, {from: owner});
            let addresses = await this.votingInstance.getAddresses();
            let voter = await this.votingInstance.getVoter(sender);
    
            expect(addresses[0]).to.equal(sender);
            expect(voter.isRegistered).to.equal(true);
        });
    
        it('Should revert if the caller is not the owner', async function () {
            await expectRevert(this.votingInstance.addToWhitelist(sender, {from: sender}), 'Ownable: caller is not the owner');
        });
    
        it('Should revert if sender is already in WhiteList', async function () {
            await this.votingInstance.addToWhitelist(sender, {from: owner});
            await expectRevert(this.votingInstance.addToWhitelist(sender, {from: owner}), 'Address already whitelisted');
        });
    
        it('Should emit event if whiteListed', async function () {
            expectEvent(await this.votingInstance.addToWhitelist(sender, {from: owner}), 'VoterRegistered', {voterAddress: sender});
        });  
    });

    contract('workflow upDate', () => {
        it('Should change worflow status', async function () {
            let workflow = await this.votingInstance.getWorkflow();
            expect(workflow).to.be.bignumber.equal(new BN(0));

            await this.votingInstance.startProposalsRegistration();
            let workflow2 = await this.votingInstance.getWorkflow();
            expect(workflow2).to.be.bignumber.equal(new BN(1));
        });

        it('Should emit an event after changing worflow', async function () {
            expectEvent(await this.votingInstance.startProposalsRegistration(), 'WorkflowStatusChange', {previousStatus: new BN(0), newStatus: new BN(1)});
        });
    });

    contract('Register proposals', () => {

        it('Should register a proposal', async function () {
            await this.votingInstance.addToWhitelist(accounts[1], {from: owner});
            await this.votingInstance.startProposalsRegistration();
            await this.votingInstance.registerProposal('more coffee breaks', {from: sender});
            let proposals = await this.votingInstance.getProposals();

            expect(proposals[0].description).to.equal('more coffee breaks');
        });

        it('Should revert if caller is not whitelisted', async function () {
            await this.votingInstance.startProposalsRegistration();
            await expectRevert(this.votingInstance.registerProposal('more coffee breaks', {from: sender}), 'Address not whitelisted');
        });

        it('Should revert if workflow is not correct', async function () {
            await this.votingInstance.addToWhitelist(sender, {from: owner});
            await expectRevert(this.votingInstance.registerProposal('more coffee breaks', {from: sender}), 'Worflow not respected');
        });

        it('Should end the registering proposals period', async function () {
            await this.votingInstance.startProposalsRegistration();
            await this.votingInstance.endProposalsRegistration();
            let workflow = await this.votingInstance.getWorkflow();

            expect(workflow).to.be.bignumber.equal(new BN(2));
        });

        it('Should send an event when starting and ending proposals registration', async function () {
            expectEvent(await this.votingInstance.startProposalsRegistration(), 'ProposalsRegistrationStarted');
            expectEvent(await this.votingInstance.endProposalsRegistration(), 'ProposalsRegistrationEnded');
        });

        it('Should send an event when a proposal is registered', async function () {
            await this.votingInstance.addToWhitelist(sender, {from: owner});
            await this.votingInstance.startProposalsRegistration();

            expectEvent(await this.votingInstance.registerProposal('more coffee breaks', {from: sender}), 'ProposalRegistered', {proposalId: new BN(0)});
        });
    });

    contract('Register votes', () => {

        beforeEach(async function () {
            await this.votingInstance.addToWhitelist(sender, {from: owner});
            await this.votingInstance.startProposalsRegistration();
            await this.votingInstance.registerProposal('more coffee breaks', {from: sender});
            await this.votingInstance.registerProposal('longer nap times', {from: sender});
            await this.votingInstance.endProposalsRegistration();
        });

        it('Should register voters', async function () {
            await this.votingInstance.startVotingSession();
            let voterBefore = await this.votingInstance.getVoter(sender);
            let proposalsBefore = await this.votingInstance.getProposals();

            await this.votingInstance.registerVote(new BN(1), {from: sender});

            let voter = await this.votingInstance.getVoter(sender);
            let proposals = await this.votingInstance.getProposals();

            expect(voterBefore.hasVoted).to.equal(false);
            expect(voter.hasVoted).to.equal(true);
            expect(voterBefore.votedProposalId).to.be.bignumber.equal(new BN(0));
            expect(voter.votedProposalId).to.be.bignumber.equal(new BN(1));
            expect(proposalsBefore[1].voteCount).to.be.bignumber.equal(new BN(0));
            expect(proposals[1].voteCount).to.be.bignumber.equal(new BN(1));
        });

        it('Should update the winningProposalIds', async function () {
            await this.votingInstance.startVotingSession();
            let winnerBefore = await this.votingInstance.getWinningProposalId();

            await this.votingInstance.registerVote(new BN(1), {from: sender});
            let winnerAfter = await this.votingInstance.getWinningProposalId();

            expect(winnerBefore).to.be.bignumber.equal(new BN(0));
            expect(winnerAfter).to.be.bignumber.equal(new BN(1));
        });

        it('Should revert if not whitelisted', async function () {
            await this.votingInstance.startVotingSession();
            await expectRevert(this.votingInstance.registerVote(new BN(1), {from: owner}), 'Address not whitelisted');
        });

        it('Should revert if not correct workflow', async function () {
            await expectRevert(this.votingInstance.registerVote(new BN(1), {from: sender}), 'Worflow not respected');
        });

        it('Should revert if has already voted', async function () {
            await this.votingInstance.startVotingSession();
            await this.votingInstance.registerVote(new BN(1), {from: sender});
            await expectRevert(this.votingInstance.registerVote(new BN(1), {from: sender}), 'Address has already voted');
        });

        it('SHould send an event when starting and ending votes registration', async function () {
            expectEvent(await this.votingInstance.startVotingSession(), 'VotingSessionStarted');
            expectEvent(await this.votingInstance.endVotingSession(), 'VotingSessionEnded');
        });

        it('Should send an event when a vote is registered', async function () {
            await this.votingInstance.startVotingSession();
            expectEvent(await this.votingInstance.registerVote(new BN(1), {from: sender}), 'Voted', {voter: sender, proposalId: new BN(1)});
        });
    }); 
});