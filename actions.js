const github = require("@actions/github");
const api = require("./api");

const createCard = async (env) => {
  const issue = github.context.payload.issue

  const labelIds = await api.getLabelIds(env, issue.labels);
  const memberIds = await api.getMemberIds(env, issue.assignees);

  api.call(env, "/cards", "POST", {
    "idList": env.todoListId,
    "keepFromSource": "all",
    "name": `[#${issue.number}] ${issue.title}`,
    "desc": issue.body,
    "urlSource": issue.html_url,
    "idMembers": memberIds.join(),
    "idLabels": labelIds.join(),
    "pos": "bottom",
  });
};

const editCard = async (env) => {
  const issue = github.context.payload.issue;
  const number = issue.number;

  const labelIds = await api.getLabelIds(env, issue.labels);
  const memberIds = await api.getMemberIds(env, issue.assignees);
  const existsCard = await api.findCard(env, issue.number);

  api.call(env, `/cards/${existsCard.id}`, "PUT", {
    "name": `[#${number}] ${issue.title}`,
    "desc": issue.body,
    "urlSource": issue.html_url,
    "idMembers": memberIds.join(),
    "idLabels": labelIds.join(),
  });
};

const openCard = async (env) => {
  const issue = github.context.payload.issue;

  const existsCard = await api.findCard(env, issue.number);

  api.call(env, `/cards/${existsCard.id}`, "PUT", {
    idList: env.todoListId
  });
}

const closeCard = async (env) => {
  const issue = github.context.payload.issue;

  const existsCard = await api.findCard(env, issue.number);

  api.call(env, `/cards/${existsCard.id}`, "PUT", {
    idList: env.doneListId
  });
}

const archiveCard = async (env) => {
  const issue = github.context.payload.issue;

  const existsCard = await api.findCard(env, issue.number);

  api.call(env, `/cards/${existsCard.id}`, "PUT", {
    closed: true
  });
};

const generateCommentHeader = (comment) => {
  return `[ [Commented on GitHub](${comment.html_url}) - by ${comment.user.login}]`;
}

const addComment = async (env) => {
  const comment = github.context.payload.comment;
  const issue = github.context.payload.issue;

  const commentHeader = generateCommentHeader(comment);
  const existsCard = await api.findCard(env, issue.number);
  api.call(env, `/cards/${existsCard.id}/actions/comments`, "POST", {
    "text": commentHeader + "\n\n" + comment.body
  });
};

const editComment = async (env) => {
  const comment = github.context.payload.comment;
  const issue = github.context.payload.issue;

  const existsCard = await api.findCard(env, issue.number);

  const commentHeader = generateCommentHeader(comment);
  const existComment = await api.findComment(env, existsCard.id, commentHeader);
  api.call(env, `/cards/${existsCard.id}/actions/${existComment.id}/comments`, "PUT", {
    "text": commentHeader + "\n\n" + comment.body
  });
};

const deleteComment = async (env) => {
  const comment = github.context.payload.comment;
  const issue = github.context.payload.issue;

  const existsCard = await api.findCard(env, issue.number);

  const commentHeader = generateCommentHeader(comment);
  const existComment = await api.findComment(env, existsCard.id, commentHeader);
  api.call(env, `/cards/${existsCard.id}/actions/${existComment.id}/comments`, "DELETE");
};

exports.createCard = createCard;
exports.editCard = editCard;
exports.openCard = openCard;
exports.closeCard = closeCard;
exports.archiveCard = archiveCard;
exports.addComment = addComment;
exports.editComment = editComment;
exports.deleteComment = deleteComment;