const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request-promise-native');

try {
  const apiKey = process.env['TRELLO_API_KEY'];
  const apiToken = process.env['TRELLO_API_TOKEN'];
  const boardId = process.env['TRELLO_BOARD_ID'];
  const action = core.getInput('trello-action');

  switch (action) {
    case 'create_card_when_issue_opened':
      createCardWhenIssueOpen(apiKey, apiToken, boardId);
      break;
    case 'move_card_when_pull_request_opened':
      moveCardWhenPullRequestOpen(apiKey, apiToken, boardId);
      break;
    case 'move_card_when_pull_request_closed':
      moveCardWhenPullRequestClose(apiKey, apiToken, boardId);
      break;

  }
} catch (error) {
  core.setFailed(error.message);
}

function createCardWhenIssueOpen(apiKey, apiToken, boardId) {
  // const listId = process.env['TRELLO_LIST_ID'];
  const issue = github.context.payload.issue
  const number = issue.number;
  var title = issue.title;
  const description = issue.body;
  const url = issue.html_url;
  const assignees = issue.assignees.map(assignee => assignee.login);
  const issueLabelNames = issue.labels.map(label => label.name);

  // get board name and ID, then listId of To Do list.
  var boardName = getBoardName(title);
  console.log(boardName);

  // remove boardName from the issue title
  title = title.replace(boardName, "").replace("[] ","");
  if (boardName) {
    // split boardName in multiple parts if " & " is present
    var names = boardName.split(" & ");
    console.log("Issue duplicates: " + names.length);
    getBoards(apiKey, apiToken).then(function(response) {    
      for (var ii=0; ii<names.length; ii++) {
        var name = names[ii];
        var boardId = getBoardId(response, name); 
        if (boardId) {
          getLists(apiKey, apiToken, boardId).then(function(response) { 
            var listId = getToDoList(response, boardId);
            if (listId) {
              getLabelsOfBoard(apiKey, apiToken, boardId).then(function(response) {
                const trelloLabels = response;
                const trelloLabelIds = [];
                issueLabelNames.forEach(function(issueLabelName) {
                  trelloLabels.forEach(function(trelloLabel) {
                    if (trelloLabel.name == issueLabelName) {
                      trelloLabelIds.push(trelloLabel.id);
                    }
                  });
                });
        
                getMembersOfBoard(apiKey, apiToken, boardId).then(function(response) {
                  const members = response;
                  const memberIds = [];
                  assignees.forEach(function(assignee) {
                    members.forEach(function(member) {
                      if (member.username == assignee) {
                        memberIds.push(member.id)
                      }
                    });
                  });
                  const cardParams = {
                    number: number, title: title, description: description, url: url, memberIds: memberIds.join(), labelIds: trelloLabelIds.join()
                  }
        
                  createCard(apiKey, apiToken, listId, cardParams).then(function(response) {
                    // Remove cover from card 
                    const cardId = response.id;
                    removeCover(apiKey, apiToken, cardId);
                    console.dir(response);
                  });
                });
              });
            }
          });
        } 
      }
    });
  }
}

function moveCardWhenPullRequestOpen(apiKey, apiToken, boardId) {
  const departureListId = process.env['TRELLO_DEPARTURE_LIST_ID'];
  const destinationListId = process.env['TRELLO_DESTINATION_LIST_ID'];
  const pullRequest = github.context.payload.pull_request
  const issue_number = pullRequest.body.match(/#[0-9]+/)[0].slice(1);
  const url = pullRequest.html_url;
  const reviewers = pullRequest.requested_reviewers.map(reviewer => reviewer.login);

  getMembersOfBoard(apiKey, apiToken, boardId).then(function(response) {
    const members = response;
    const additionalMemberIds = [];
    reviewers.forEach(function(reviewer) {
      members.forEach(function(member) {
        if (member.username == reviewer) {
          additionalMemberIds.push(member.id);
        }
      });
    });

    getCardsOfList(apiKey, apiToken, departureListId).then(function(response) {
      const cards = response;
      let cardId;
      let existingMemberIds = [];
      cards.some(function(card) {
        const card_issue_number = card.name.match(/#[0-9]+/)[0].slice(1);
        if (card_issue_number == issue_number) {
          cardId = card.id;
          existingMemberIds = card.idMembers;
          return true;
        }
      });
      const cardParams = {
        destinationListId: destinationListId, memberIds: existingMemberIds.concat(additionalMemberIds).join()
      }

      if (cardId) {
        putCard(apiKey, apiToken, cardId, cardParams).then(function(response) {
          addUrlSourceToCard(apiKey, apiToken, cardId, url);
        });
      } else {
        core.setFailed('Card not found.');
      }
    });
  });
}

function moveCardWhenPullRequestClose(apiKey, apiToken, boardId) {
  const departureListId = process.env['TRELLO_DEPARTURE_LIST_ID'];
  const destinationListId = process.env['TRELLO_DESTINATION_LIST_ID'];
  const pullRequest = github.context.payload.pull_request
  const issue_number = pullRequest.body.match(/#[0-9]+/)[0].slice(1);
  const url = pullRequest.html_url;
  const reviewers = pullRequest.requested_reviewers.map(reviewer => reviewer.login);

  getMembersOfBoard(apiKey, apiToken, boardId).then(function(response) {
    const members = response;
    const additionalMemberIds = [];
    reviewers.forEach(function(reviewer) {
      members.forEach(function(member) {
        if (member.username == reviewer) {
          additionalMemberIds.push(member.id);
        }
      });
    });

    getCardsOfList(apiKey, apiToken, departureListId).then(function(response) {
      const cards = response;
      let cardId;
      let existingMemberIds = [];
      cards.some(function(card) {
        const card_issue_number = card.name.match(/#[0-9]+/)[0].slice(1);
        if (card_issue_number == issue_number) {
          cardId = card.id;
          existingMemberIds = card.idMembers;
          return true;
        }
      });
      const cardParams = {
        destinationListId: destinationListId, memberIds: existingMemberIds.concat(additionalMemberIds).join()
      }

      if (cardId) {
        putCard(apiKey, apiToken, cardId, cardParams);
      } else {
        core.setFailed('Card not found.');
      }
    });
  });
}

function getBoardName(title) {
  var board = title.match(/\[.+\]/g);
  if (board) {
    return board[0].replace("[","").replace("]","")
  }
  return null
}

function getBoardId(boards, boardName) {
    console.log("Boards length: " + boards.length);
    for (var ii=0; ii<boards.length; ii++) {
      var board = boards[ii];
      if (board.name.toLowerCase() == boardName.toLowerCase()) {
        console.log("Board found!" + boardName);
        return board.id
      }
    }
    console.log("Board not found! " + boardName);
    return null
}

function getToDoList(lists, boardId) {
  console.log("Enter getToDo")
  // Get the list ID of the "To Do" list in the board
  for (var ii=0; ii<lists.length; ii++) {
    var myList = lists[ii];
    if (myList.name.toLowerCase() == "to do") {
      return myList.id
    }
  }
  return null
}

function getBoards(apiKey, apiToken) {
  console.log("Enter getBoards")
  return new Promise(function(resolve, reject) {
    request(`https://api.trello.com/1/members/me/boards?fields=name,id&key=${apiKey}&token=${apiToken}`)
      .then(function(body) {
        resolve(JSON.parse(body));
        console.log("Get Boards request success!");
        console.log("Boards found after request: " + JSON.parse(body).length)
      })
      .catch(function(error) {
        reject(error);
      })
  });
}

function getLists(apiKey, apiToken, boardId) {
  return new Promise(function(resolve, reject) {
    request(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${apiToken}`)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
        reject(error);
      })
  });
}

function getLabelsOfBoard(apiKey, apiToken, boardId) {
  return new Promise(function(resolve, reject) {
    request(`https://api.trello.com/1/boards/${boardId}/labels?key=${apiKey}&token=${apiToken}`)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
        reject(error);
      })
  });
}

function getMembersOfBoard(apiKey, apiToken, boardId) {
  return new Promise(function(resolve, reject) {
    request(`https://api.trello.com/1/boards/${boardId}/members?key=${apiKey}&token=${apiToken}`)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
        reject(error);
      })
  });
}

function getCardsOfList(apiKey, apiToken, listId) {
  return new Promise(function(resolve, reject) {
    request(`https://api.trello.com/1/lists/${listId}/cards?key=${apiKey}&token=${apiToken}`)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
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
      'pos': 1
    },
    json: true
  }
  return new Promise(function(resolve, reject) {
    request(options)
      .then(function(body) {
        resolve(body);
      })
      .catch(function(error) {
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
  return new Promise(function(resolve, reject) {
    request(options)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
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
  return new Promise(function(resolve, reject) {
    request(options)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
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
  return new Promise(function(resolve, reject) {
    request(options)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
        reject(error);
      })
  });
}
