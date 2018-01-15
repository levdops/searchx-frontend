import request from 'superagent';
import EventEmitter from 'events';
import AccountStore from "./AccountStore";

const env = require('env');

////

const choices = [
    {value: 1, text: "I don't remember having seen this term/phrase before." }, 
    {value: 2, text: "I have seen this term/phrase before, but I don't think I know what it means."}, 
    {value: 3, text: "I have seen this term/phrase before, and I think I know what it means."},
    {value: 4, text: "I know this term/phrase."}
];

let state = {
    topics: JSON.parse(localStorage.getItem("topics")) || []
};

////

const TaskStore = Object.assign(EventEmitter.prototype, {

    initializeTask(callback) {
        let url = '/pretest';

        request
            .get(env.serverUrl + '/v1/users/' + AccountStore.getId() + '/task')
            .end((err, res) => {
                if(err) {
                    console.log(err);
                }

                if(res) {
                    const data = res.body;
                    this.setTopics(data.topics);

                    if(data.group) {
                        AccountStore.setTask(data.group.topic);
                        AccountStore.setGroup(data.group._id, data.group.members);
                        url = '/learning';
                    }
                }

                callback(url);
            })
    },

    setTopics(topics) {
        localStorage.setItem("topics", JSON.stringify(topics));
        state.topics = topics;
    },

    ////

    getTopicDescription(topic) {
        return topic.task;
    },

    getTopicVideo(topic) {
        const prefix = "https://www.youtube.com/watch?v=";
        return prefix + topic.youtube;
    },

    getTopicById(topicId) {
        const topic = state.topics.filter(x => x.id === topicId);
        if (topic.length > 0) return topic[0];
        return null;
    },

    ////

    isIntroVideoDone() {
        return localStorage.getItem("intro-done-video") === 'true';
    },

    isIntroSearchDone() {
        return localStorage.getItem("intro-done-search") === 'true';
    },

    isOverSwitchTabsLimit() {
        const switchTabsPreTest = localStorage.getItem("switch-tabs-posttest");
        const switchTabsPostTest = localStorage.getItem("switch-tabs-posttest");
        const switchTabsVideo = localStorage.getItem("switch-tabs-video");

        return switchTabsPreTest >= 3 || switchTabsPostTest >= 3 || switchTabsVideo >= 3;
    },

    ////

    getUserIdFromResults(results) {
        return results["userId"].replace(/\s/g, '');
    },

    getScoresFromResults(results) {
        let scores = {};
        Object.keys(results).forEach((result) => {
            const v = result.split("-");
            if (v[0] === "Q") {
                if(!scores[v[1]]) scores[v[1]] = 0;
                scores[v[1]] += parseInt(results[result]);
            }
        });

        return this.formatScores(scores);
    },

    formatScores(scores) {
        return Object.keys(scores)
            .filter((key) => key !== '0')
            .map(key => {
                return {
                    topicId: key,
                    score: scores[key]
                };
            })
            .sort((a,b) => a.score - b.score);
    },

    ////

    getRegisterInfo() {
        return registerInfoPage();
    },

    getPreTest() {
        return preTestPage(state.topics);
    },

    getPostTest() {
        return postTestPage(AccountStore.getTaskTopic());
    },

    ////

    surveyValidateWordCount (s, options) {
        if (options.name === 'summary') {
            const text = options.value;
            const c = text.split(" ").length;

            if (c < 50) {
                options.error = "You have written only " + c + " words, you need to write at least 50 words to complete the exercises.";
            }
        }
    }
});

////

const registerInfoPage = function() {
    let pages = [];
    let elements = [];

    elements.push({
        type: "html",
        name: "topic",
        html: "<h2>Registration</h2>" +
        "<h3>Let's find out what you already know first.</h3>" +
        "<h3>First fill out this basic information about you.</h3>"
    });

    elements.push({
        type: "html",
        html: "<hr/>"
    });

    elements.push({
            title: "Insert your Prolific ID here",
            name : "userId",
            type :"text",
            inputType:"text",
            width: 300,
            isRequired: true
        }
    );

    elements.push({
        type: "html",
        html: "<hr/>"
    });

    elements.push({
        title: "What is your highest academic degree so far?",
        name: "degree",
        type: "radiogroup",
        isRequired: true,
        choices: [
            {value: 0, text: "High School"},
            {value: 1, text: "Bachelor"},
            {value: 2, text: "Master"},
            {value: 3, text: "Doctorate"}
        ]
    });

    elements.push({
        title: "Which subject areas you have university degree(s)?",
        visibleIf: "{degree} > 0",
        name : "background",
        type :"text",
        inputType:"text",
        width: 500,
        isRequired: true
    });

    elements.push({
        type: "html",
        html: "<hr/>"
    });

    elements.push({
        title: "Are you an English native speaker?",
        name: "english",
        type: "radiogroup",
        isRequired: true,
        choices: [
            {value: 0, text: "No"},
            {value: 1, text: "Yes"},
        ]
    });

    elements.push({
        title: "What is your level of English?",
        visibleIf: "{english} == 0",
        name : "english-level",
        type: "radiogroup",
        isRequired: true,
        choices: [
            {value: 0, text: "Beginner"},
            {value: 1, text: "Elementary"},
            {value: 2, text: "Intermediate"},
            {value: 3, text: "Upper-intermediate"},
            {value: 4, text: "Advanced"},
            {value: 5, text: "Proficiency"}
        ]
    });

    elements.push({
        type: "html",
        html: "<hr/>"
    });

    elements.push({
        title: "How often do you use Web search engine (e.g., Google, Bing, Yahoo) when you want to learn about something?",
        name: "search-frequency",
        type: "radiogroup",
        isRequired: true,
        choices: [
            {value: 0, text: "More than 10 times a day"},
            {value: 1, text: "1-10 times a day"},
            {value: 2, text: "Once a day"},
            {value: 3, text: "Every few days"},
            {value: 4, text: "Never"}
        ]
    });

    pages.push({elements:  elements});
    return {
        pages: pages,
        showQuestionNumbers: "off",
        completedHtml: "    "
    }
};

const preTestPage = function(topics) {
    let pages = [];

    topics.forEach(topic => {
        let elements = [];

        elements.push({
            type: "html",
            name: "topic",
            html: "<h2>Diagnostic Test</h2> " +
            "<h3>Let's find out what you already know first.</h3>" +
            "<h3>Answer these questions about <b>" + topic.title + "</b>:</h3>"
        });

        topic.terms.forEach((term, idx) => {
            const name = "Q-"+ topic.id +"-"+ idx;

            elements.push({
                type: "html",
                html: "<hr/>"
            });

            elements.push({
                title: "How much do you know about \"" + term + "\"?",
                type: "radiogroup",
                isRequired: true,
                name: name,
                choices: choices
            });

            elements.push({
                title: "In your own words, what do you think the meaning is?",
                visibleIf: "{" + name + "} > 2",
                name: "meaning-" + name,
                type: "text",
                inputType: "text",
                width: 500,
                isRequired: true
            });
        });

        pages.push({elements:  elements});
    });

    ////

    return {
        pages: pages,
        showProgressBar: "top",
        showQuestionNumbers: "off",
        completedHtml: "<p> </p>  "
    }
};

const postTestPage = function(topic) {
    let pages = [];

    ////

    let elements = [];

    elements.push({
        type: "html",
        name: "topic",
        html: "<h2>Final Exercises</h2>" +
        "<h3>Let's see how much you've learned.</h3>" +
        "<h3>Answer these questions about <b>" + topic.title + "</b>:</h3>"
    });

    topic.terms.forEach((term, idx) => {
        const name = "Q-"+ topic.id +"-"+ idx;

        elements.push({
            type: "html",
            html: "<hr/>"
        });

        elements.push({
            title: "How much do you know about \"" + term + "\"?",
            type: "radiogroup",
            isRequired: true,
            name: name,
            choices: choices
        });

        elements.push({
            title: "In your own words, what do you think the meaning is?",
            visibleIf: "{" + name + "} > 2",
            name: "meaning-" + idx,
            type: "text",
            inputType: "text",
            width: 500,
            isRequired: true,
        });
    });

    pages.push({elements:  elements});

    ////

    elements = [];

    elements.push({
        type: "html",
        name: "outline-description",
        html: "<b> Based on what you have learned from the learning session, please write an outline for your paper. </b>" +
        "<p> Tip: An outline is an organizational plan to help you draft a paper. Here is a simple template example: </p>" +

        "<p> 1. Introduction</p>" +
        "<p> 1.1. Main argument: ...</p>" +
        "<p> 1.2 Purpose of the paper: ... </p>" +

        "<p> 2. Body </p>" +
        "<p> 2.1 Argument 1: ....</p>" +
        "<p> 2.2 Argument 2: .... </p>" +

        "<p> 3. Conclusions</p>" +
        "<p> Summary: ....</p>"
    });

    elements.push({
        title: "Write your outline here:",
        name: "outline-paper",
        type: "comment",
        inputType: "text",
        description: "",
        width: 600,
        rows: 6,
        height: 1000,
        isRequired: true
    });

    elements.push({
        title: "Please write what you have learned about this topic from the learning session. Use at least 50 words.",
        name: "summary",
        type: "comment",
        inputType: "text",
        width: 600,
        height: 1000,
        rows: 5,
        isRequired: true
    });

    elements.push({
        type: "html",
        html: "<hr/>"
    });

    if (AccountStore.getTaskType() === "search") {
        elements.push({
            title: "During your searches did you have difficulties finding information about something? If so, describe briefly what you were looking for.",
            name: "difficulties",
            type: "comment",
            inputType: "text",
            width: 600,
            height: 300,
            isRequired: true
        });
    }

    elements.push({
        title: "Do you have any additional comments?",
        name: "additional-comment",
        type: "comment",
        inputType: "text",
        width: 600,
        height: 200,
        rows: 4,
        isRequired: true
    });

    pages.push({elements:  elements});

    ////

    return {
        pages: pages,
        showProgressBar: "top",
        showQuestionNumbers: "off",
        completedHtml: "<p> </p>"
    }
};

export default TaskStore;