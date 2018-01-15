import EventEmitter from 'events';
import io from 'socket.io-client';

import AccountStore from "./AccountStore";
import AppActions from "../AppActions";

const env = require('env');
const socket = io(env.serverUrl + '/group');

////

if (AccountStore.getId() !== '') {
    socket.emit('register', {
        userId: AccountStore.getId(),
        groupId: AccountStore.getSessionId()
    });
}

if (AccountStore.isCollaborative()) {
    socket.on('bookmarkUpdate', (data) => {
        AppActions.getBookmarks();
        AppActions.refreshSearch(data.query, data.vertical, data.pageNumber);
    });

    socket.on('searchState', (data) => {
        AppActions.getQueryHistory();
    });
}

////

const SyncStore = Object.assign(EventEmitter.prototype, {

    listenToGrouping(callback) {
        socket.on('groupData', (data) => {
            callback(data.group)
        });
    },

    emitPretestScore(scores) {
        socket.emit('pushPretestScores', {
            userId: AccountStore.getId(),
            sessionId: AccountStore.getSessionId(),
            scores: scores
        });
    },

    emitGroupTimeout() {
        socket.emit('pushGroupTimeout', {
            userId: AccountStore.getId()
        });
    },

    ////

    emitSearchState(searchState) {
        socket.emit('pushSearchState', {
            sessionId: AccountStore.getSessionId(),
            userId: AccountStore.getId(),
            state: searchState
        });
    },

    emitBookmarkUpdate(searchState) {
        socket.emit('pushBookmarkUpdate', searchState);
    }
});

export default SyncStore;