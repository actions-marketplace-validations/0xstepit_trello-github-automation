#!/usr/bin/env node
const core = require("@actions/core");
const actions = require("./actions.js");

try {
  const env = {
    apiKey: process.env["TRELLO_API_KEY"],
    apiToken: process.env["TRELLO_API_TOKEN"],
    boardId: process.env["TRELLO_BOARD_ID"],
    todoListId: process.env["TRELLO_TODO_LIST_ID"],
    doneListId: process.env["TRELLO_DONE_LIST_ID"],
    memberMap: JSON.parse(process.env["TRELLO_MEMBER_MAP"])
    .map(row => row.toLowerCase())
    .map(row => row.split(":"))
    .reduce((map, data) => {
      map[data[0]] = data[1];
      return map;
    }, {}),
  };

  const action = core.getInput("trello-action");
  core.info("Action: " + action);
  switch (action) {
    case "create_card":
      actions.createCard(env);
      break;
    case "edit_card":
      actions.editCard(env);
      break;
    case "move_card_to_todo":
      actions.openCard(env);
      break;
    case "move_card_to_done":
      actions.closeCard(env);
      break;
    case "archive_card":
      actions.archiveCard(env);
      break;
    case "add_comment":
      actions.addComment(env);
      break;
    case "edit_comment":
      actions.editComment(env);
      break;
    case "delete_comment":
      actions.deleteComment(env);
      break;
    default:
      core.error(new Error("Invalid Action: " + action));
  }
} catch (error) {
  core.error(error)
  core.setFailed(error.message);
}

