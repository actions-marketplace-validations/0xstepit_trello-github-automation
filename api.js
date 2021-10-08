const axios = require("axios").default;

const call = (env, path, method, body = {}) => {
  const instance = axios.create({
    baseURL: "https://api.trello.com/1",
    params: {
      key: env.apiKey,
      token: env.apiToken
    },
    headers: {
      "Content-Type": "application/json"
    },
  });

  return instance.request({
    url: path,
    method: method,
    data: body,
  })
  .then((response) => {
    return response.data;
  });
}

const getLabelIds = (env, labels) => {
  return call(env, `/boards/${env.boardId}/labels`, "GET")
  .then(data => {
    return labels
    .map(label => label.name.toLowerCase())
    .map(labelName => data.find(each => each.name.toLowerCase() === labelName))
    .filter(trelloLabel => Boolean(trelloLabel))
    .map(trelloLabel => trelloLabel.id)
  });
}

const getMemberIds = (env, assignees) => {
  return call(env, `/boards/${env.boardId}/members`, "GET")
  .then(data => {
    return assignees
    .map(assignee => env.memberMap[assignee.login.toLowerCase()])
    .map(assignee => data.find(each => each.username.toLowerCase() === assignee))
    .filter(member => Boolean(member))
    .map(member => member.id);
  });
}

const findCard = (env, issueNumber) => {
  const existCard = call(env, `/boards/${env.boardId}/cards`, "GET")
  .then(data => data.find(card => card.name.startsWith(`[#${issueNumber}]`)));

  if (!existCard) {
    throw new Error("Card cannot Found");
  }

  return existCard;
}

const findComment = (env, cardId, commentHeader) => {
  const existComment = call(env, `/cards/${cardId}/actions?filter=commentCard`, "GET")
  .then(data => data
    .filter(each => each.data && each.data.text)
    .find(each => each.data.text.startsWith(commentHeader))
  );

  if (!existComment) {
    throw new Error("Comment cannot Found");
  }

  return existComment;
}

exports.call = call;
exports.getLabelIds = getLabelIds;
exports.getMemberIds = getMemberIds;
exports.findCard = findCard;
exports.findComment = findComment;