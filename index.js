#!/usr/bin/env node
const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request-promise-native');
try {
  const apiKey = process.env['TRELLO_API_KEY'];
  const apiToken = process.env['TRELLO_API_TOKEN'];
  const boardId = process.env['TRELLO_BOARD_ID'];
  const rawMemberMap = JSON.parse(process.env['TRELLO_MEMBER_MAP']); // github username: trello username 
  const action = core.getInput('trello-action');
  let memberMap = {};
  rawMemberMap.map((row) => {
    row = row.split(':');
    memberMap[row[0].toLowerCase()] = row[1].toLowerCase();
  });

  console.log('Member Map', memberMap);
  console.log('Action:', action);
  switch (action) {
    case 'create_card_when_issue_opened':
      createCardWhenIssueOpen(apiKey, apiToken, boardId, memberMap);
      break;
    case 'change_card_when_issue_edited':
      changeCardWhenIssueEdited(apiKey, apiToken, boardId, memberMap);
      break;
    case 'move_card_when_pull_request_opened':
      moveCardWhenPullRequestOpen(apiKey, apiToken, boardId, memberMap);
      break;
    case 'move_card_when_pull_request_closed':
      moveCardWhenPullRequestClose(apiKey, apiToken, boardId, memberMap);
      break;

  }
} catch (error) {
  console.log('Error', error);
  core.setFailed(error.message);
}

function createCardWhenIssueOpen(apiKey, apiToken, boardId, memberMap) {
  const bugLabels = process.env['BUG_LABELS'].split(',');
  const todoListId = process.env['TRELLO_TODO_LIST_ID'];
  const bugListId = process.env['TRELLO_BUG_LIST_ID'];
  const issue = github.context.payload.issue
  const number = issue.number;
  var title = issue.title;
  const description = issue.body;
  const url = issue.html_url;
  const assignees = issue.assignees.map(assignee => assignee.login);
  const issueLabelNames = issue.labels.map(label => label.name);
  var isBug = false;
  issueLabelNames.forEach(function (issueLabelName) {
    bugLabels.forEach(function (bugLabel) {
      if (bugLabel == issueLabelName) {
        isBug = true;
      }
    });
  });

  var listId;
  if (isBug) {
    listId = bugListId;
  } else {
    listId = todoListId;
  }
  console.log('ListID', listId);
  if (listId) {
    getLabelsOfBoard(apiKey, apiToken, boardId).then(function (response) {
      const trelloLabels = response;
      const trelloLabelIds = [];
      issueLabelNames.forEach(function (issueLabelName) {
        trelloLabels.forEach(function (trelloLabel) {
          if (trelloLabel.name == issueLabelName) {
            trelloLabelIds.push(trelloLabel.id);
          }
        });
      });

      getMembersOfBoard(apiKey, apiToken, boardId).then(function (response) {
        const members = response;
        const memberIds = [];
        assignees.forEach(function (assignee) {
          assignee = assignee.toLowerCase();
          members.forEach(function (member) {
            member.username = member.username.toLowerCase();
            if (member.username == memberMap[assignee]) {
              memberIds.push(member.id)
            }
          });
        });
        const cardParams = {
          number: number, title: title, description: description, url: url, memberIds: memberIds.join(), labelIds: trelloLabelIds.join()
        }

        createCard(apiKey, apiToken, listId, cardParams).then(function (response) {
          // Remove cover from card 
          const cardId = response.id;
          removeCover(apiKey, apiToken, cardId);
          console.dir(response);
        });
      });
    });
  }
}

function changeCardWhenIssueEdited(apiKey, apiToken, boardId, memberMap) {
  const bugLabels = process.env['BUG_LABELS'].split(',');
  const todoListId = process.env['TRELLO_TODO_LIST_ID'];
  const bugListId = process.env['TRELLO_BUG_LIST_ID'];
  const issue = github.context.payload.issue
  const number = issue.number;
  var title = issue.title;
  const description = issue.body;
  const url = issue.html_url;
  const assignees = issue.assignees.map(assignee => assignee.login);
  const issueLabelNames = issue.labels.map(label => label.name);
  var isBug = false;
  issueLabelNames.forEach(function (issueLabelName) {
    bugLabels.forEach(function (bugLabel) {
      if (bugLabel == issueLabelName) {
        isBug = true;
      }
    });

  }
  );

  var listId;
  if (isBug) {
    listId = bugListId;
  } else {
    listId = todoListId;
  }
  console.log('ListID', listId);
  if (listId) {
    getLabelsOfBoard(apiKey, apiToken, boardId).then(function (response) {
      const trelloLabels = response;
      const trelloLabelIds = [];
      issueLabelNames.forEach(function (issueLabelName) {
        trelloLabels.forEach(function (trelloLabel) {
          if (trelloLabel.name == issueLabelName) {
            trelloLabelIds.push(trelloLabel.id);
          }
        });
      });

      getMembersOfBoard(apiKey, apiToken, boardId).then(function (response) {
        const members = response;
        console.log('GH Assignees', assignees);
        console.log('Trello Members', members);
        const memberIds = [];
        assignees.forEach(function (assignee) {
          assignee = assignee.toLowerCase();
          members.forEach(function (member) {
            member.username = member.username.toLowerCase();
            if (member.username == memberMap[assignee]) {
              memberIds.push(member.id)
            }
          });
        });
        const cardParams = {
          number: number, title: title, description: description, url: url, memberIds: memberIds.join(), labelIds: trelloLabelIds.join()
        }

        getCardsOfBoard(apiKey, apiToken, boardId).then(function (response) {
          // console.log('Github Payload', github.context.payload);
          const cards = response;
          let cardId;
          let existingMemberIds = [];
          let cardData;
          cards.some(function (card) {
            // console.log('Card Check', card);
            if (card.name.startsWith(`[#${number}]`)) {
              cardId = card.id;
              existingMemberIds = card.idMembers;
              cardData = card;
              return true;
            }
          });

          if (cardId) {
            console.log('CardParams', cardParams);
            updateCard(apiKey, apiToken, cardId, cardParams).then(function (response) {
              // Remove cover from card 
              const cardId = response.id;
              removeCover(apiKey, apiToken, cardId);
              console.dir(response);
              // todo: Move card if bug label changed
              console.log('CardData', cardData);
            });
          } else {
            core.setFailed('Card not found.');
          }
        });

      });
    });
  }
}

function moveCardWhenPullRequestOpen(apiKey, apiToken, boardId, memberMap) {
  const departureListIds = process.env['TRELLO_DEPARTURE_LIST_IDS'].split(',');
  const destinationListId = process.env['TRELLO_DESTINATION_LIST_ID'];
  const pullRequest = github.context.payload.pull_request;
  const regex = /#[0-9]+/g;
  const matches = [...pullRequest.body.matchAll(regex)];
  let issues = [];
  matches.forEach((m) => {
    issues.push(m[0]);
  })
  console.log('PR Issues', issues);
  const url = pullRequest.html_url;
  const reviewers = pullRequest.requested_reviewers.map(reviewer => reviewer.login);
  console.log('departureListIds', departureListIds);

  console.log('PR', pullRequest.id);
  if (destinationListId) {
    getMembersOfBoard(apiKey, apiToken, boardId).then(function (response) {
      const members = response;
      console.log('Members', members);
      const additionalMemberIds = [];
      reviewers.forEach(function (reviewer) {
        reviewer = reviewer.toLowerCase();
        members.forEach(function (member) {
          member.username = member.username.toLowerCase();
          if (member.username == memberMap[reviewer]) {
            additionalMemberIds.push(member.id);
          }
        });
      });

      departureListIds.forEach(departureListId => {
        getCardsOfList(apiKey, apiToken, departureListId).then(function (response) {
          const cards = response;
          console.log('Cards', cards.length);
          if (cards && cards.length) {
            cards.forEach(function (card) {
              let card_match = card.name.match(/#[0-9]+/);
              if (card_match && card_match.length) {
                const card_issue_number = card_match[0].slice(1);
                if (issues.includes(`#${card_issue_number}`)) {
                  let cardId = card.id;
                  if (cardId) {
                    console.log('Card Found', card.name);
                    let existingMemberIds = card.idMembers;
                    const cardParams = {
                      destinationListId: destinationListId, memberIds: existingMemberIds.concat(additionalMemberIds).join()
                    }
                    console.log('cardParams', cardParams);
                    putCard(apiKey, apiToken, cardId, cardParams).then(function (response) {
                      console.log('Card Updated', response);
                      addUrlSourceToCard(apiKey, apiToken, cardId, url);
                    });
                  }
                }
              }
            });
          }
        });
      });
    });
  }
}

function moveCardWhenPullRequestClose(apiKey, apiToken, boardId, memberMap) {
  const departureListIds = process.env['TRELLO_DEPARTURE_LIST_IDS'];
  const destinationListId = process.env['TRELLO_DESTINATION_LIST_ID'];
  const pullRequest = github.context.payload.pull_request
  const regex = /#[0-9]+/g;
  const matches = [...pullRequest.body.matchAll(regex)];
  let issues = [];
  matches.forEach((m) => {
    issues.push(m[0]);
  })
  console.log('PR Issues', issues);
  const url = pullRequest.html_url;
  const reviewers = pullRequest.requested_reviewers.map(reviewer => reviewer.login);

  console.log('PR', pullRequest.id);
  if (destinationListId) {
    getMembersOfBoard(apiKey, apiToken, boardId).then(function (response) {
      const members = response;
      const additionalMemberIds = [];
      reviewers.forEach(function (reviewer) {
        reviewer = reviewer.toLowerCase();
        members.forEach(function (member) {
          member.username = member.username.toLowerCase();
          if (member.username == memberMap[reviewer]) {
            additionalMemberIds.push(member.id);
          }
        });
      });
  
      departureListIds.forEach(departureListId => {
        getCardsOfList(apiKey, apiToken, departureListId).then(function (response) {
          const cards = response;
          console.log('Cards', cards.length);
          if (cards && cards.length) {
            cards.forEach(function (card) {
              let card_match = card.name.match(/#[0-9]+/);
              if (card_match && card_match.length) {
                const card_issue_number = card_match[0].slice(1);
                if (issues.includes(`#${card_issue_number}`)) {
                  let cardId = card.id;
                  if (cardId) {
                    console.log('Card Found', card.name);
                    let existingMemberIds = card.idMembers;
                    const cardParams = {
                      destinationListId: destinationListId, memberIds: existingMemberIds.concat(additionalMemberIds).join()
                    }
                    putCard(apiKey, apiToken, cardId, cardParams);
                  }
                }
              }
            });
          }
        });
      });
    });
  }
}

function getBoardName(title) {
  var board = title.match(/\[.+\]/g);
  if (board) {
    return board[0].replace("[", "").replace("]", "")
  }
  return null
}

function getBoardId(boards, boardName) {
  console.log("Boards length: " + boards.length);
  for (var ii = 0; ii < boards.length; ii++) {
    var board = boards[ii];
    if (board.name.toLowerCase() == boardName.toLowerCase()) {
      console.log("Board found! " + boardName);
      return board.id
    }
  }
  console.log("Board not found! " + boardName);
  return null
}

function getToDoList(lists) {
  console.log("Enter getToDo")
  // Get the list ID of the "To Do" list in the board
  for (var ii = 0; ii < lists.length; ii++) {
    var myList = lists[ii];
    if (myList.name.toLowerCase() == "todo") {
      return myList.id
    }
  }
  return null
}

function getBugList(lists) {
  console.log("Enter getBugList")
  for (var ii = 0; ii < lists.length; ii++) {
    var myList = lists[ii];
    if (myList.name.toLowerCase() == "bug") {
      return myList.id
    }
  }
  return null
}

function getBoards(apiKey, apiToken) {
  console.log("Enter getBoards")
  return new Promise(function (resolve, reject) {
    request(`https://api.trello.com/1/members/me/boards?fields=name,id&key=${apiKey}&token=${apiToken}`)
      .then(function (body) {
        resolve(JSON.parse(body));
        console.log("Get Boards request success!");
        console.log("Boards found after request: " + JSON.parse(body).length)
      })
      .catch(function (error) {
        reject(error);
      })
  });
}

function getLists(apiKey, apiToken, boardId) {
  return new Promise(function (resolve, reject) {
    request(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${apiToken}`)
      .then(function (body) {
        resolve(JSON.parse(body));
      })
      .catch(function (error) {
        reject(error);
      })
  });
}

function getLabelsOfBoard(apiKey, apiToken, boardId) {
  return new Promise(function (resolve, reject) {
    request(`https://api.trello.com/1/boards/${boardId}/labels?key=${apiKey}&token=${apiToken}`)
      .then(function (body) {
        resolve(JSON.parse(body));
      })
      .catch(function (error) {
        reject(error);
      })
  });
}

function getMembersOfBoard(apiKey, apiToken, boardId) {
  return new Promise(function (resolve, reject) {
    request(`https://api.trello.com/1/boards/${boardId}/members?key=${apiKey}&token=${apiToken}`)
      .then(function (body) {
        resolve(JSON.parse(body));
      })
      .catch(function (error) {
        reject(error);
      })
  });
}

function getCardsOfList(apiKey, apiToken, listId) {
  return new Promise(function (resolve, reject) {
    request(`https://api.trello.com/1/lists/${listId}/cards?key=${apiKey}&token=${apiToken}`)
      .then(function (body) {
        resolve(JSON.parse(body));
      })
      .catch(function (error) {
        reject(error);
      })
  });
}

function getCardsOfBoard(apiKey, apiToken, boardId) {
  return new Promise(function (resolve, reject) {
    request(`https://api.trello.com/1/boards/${boardId}/cards?key=${apiKey}&token=${apiToken}`)
      .then(function (body) {
        resolve(JSON.parse(body));
      })
      .catch(function (error) {
        reject(error);
      })
  });
}


function createCard(apiKey, apiToken, listId, params) {
  const options = {
    method: 'POST',
    url: 'https://api.trello.com/1/cards',
    form: {
      'idList': listId,
      'keepFromSource': 'all',
      'key': apiKey,
      'token': apiToken,
      'name': `[#${params.number}] ${params.title}`,
      'desc': params.description,
      'urlSource': params.url,
      'idMembers': params.memberIds,
      'idLabels': params.labelIds,
      'pos': 'bottom',
    },
    json: true
  }
  return new Promise(function (resolve, reject) {
    request(options)
      .then(function (body) {
        resolve(body);
      })
      .catch(function (error) {
        reject(error);
      })
  });
}

function updateCard(apiKey, apiToken, cardId, params) {
  const options = {
    method: 'PUT',
    url: `https://api.trello.com/1/cards/${cardId}?key=${apiKey}&token=${apiToken}`,
    form: {
      'name': `[#${params.number}] ${params.title}`,
      'desc': params.description,
      'urlSource': params.url,
      'idMembers': params.memberIds,
      'idLabels': params.labelIds,
    }
  }
  return new Promise(function (resolve, reject) {
    request(options)
      .then(function (body) {
        resolve(JSON.parse(body));
      })
      .catch(function (error) {
        reject(error);
      })
  });
}

function putCard(apiKey, apiToken, cardId, params) {
  const options = {
    method: 'PUT',
    url: `https://api.trello.com/1/cards/${cardId}?key=${apiKey}&token=${apiToken}`,
    form: {
      'idList': params.destinationListId,
      'idMembers': params.memberIds,
    }
  }
  return new Promise(function (resolve, reject) {
    request(options)
      .then(function (body) {
        resolve(JSON.parse(body));
      })
      .catch(function (error) {
        reject(error);
      })
  });
}

function removeCover(apiKey, apiToken, cardId) {
  const options = {
    method: 'PUT',
    url: `https://api.trello.com/1/cards/${cardId}?key=${apiKey}&token=${apiToken}`,
    form: {
      'idAttachmentCover': null
    }
  }
  return new Promise(function (resolve, reject) {
    request(options)
      .then(function (body) {
        resolve(JSON.parse(body));
      })
      .catch(function (error) {
        reject(error);
      })
  });
}

function addUrlSourceToCard(apiKey, apiToken, cardId, url) {
  const options = {
    method: 'POST',
    url: `https://api.trello.com/1/cards/${cardId}/attachments?key=${apiKey}&token=${apiToken}`,
    form: {
      url: url
    }
  }
  return new Promise(function (resolve, reject) {
    request(options)
      .then(function (body) {
        resolve(JSON.parse(body));
      })
      .catch(function (error) {
        reject(error);
      })
  });
}
