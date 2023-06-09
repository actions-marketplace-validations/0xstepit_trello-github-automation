# Trello & Github Automation

This repo contains code to automate the link between GitHub Issues and Pull Request with Trello cards.

## Setup

This action is based on 6 environment variables that must be set at repository level to work. This means that each repository that has to be integrated with Trello  require the setup of these variable. To set these variables you can follo the official [Github guide](https://docs.github.com/en/actions/security-guides/encrypted-secrets).

Required secrets can be obtained after creating a a [Power-up](https://trello.com/power-ups/admin/)

- **TRELLO_API_KEY**: this is **API key** in the API Key section of the Trello power-up.

- **TRELLO_API_TOKEN**: this is the **Secret**

- **TRELLO_BOARD_ID**: this is the board associated with the repository.

- **TRELLO_TODO_LIST_ID**: this is the list where new cards are created.

- **TRELLO_DONE_LIST_ID**: this is the list where cards have to be moved after closing them.

- **TRELLO_MEMBER_MAP**: this is used to match Github users with Trello Users. The value in Github
have to be filled with the format `["github_user1:trello_user1", "github_user2:trello_user2"]`.

All information associated to the board and lists can be found going to the web browser version of the board and appending ".json" to the url.

![Secrets](/assets/secrets.png)

## actions

### Card Actions(on `issues` event)

#### create_card

Add Card to List '**TRELLO_TODO_LIST_ID**' with fields below

- title : formatted `[{issue number}] {issue title}` 
- description 
- member : github issue assignees to mapped by '**TRELLO_MEMBER_MAP**'
  - If there are no mapping data for assignee, it will do not join member. 
- label : apply trello labes to match _label name_. case will be ignored

#### edit_card

Edit Card that Card title starts with **`[{issue number}]`** with fields below      
If card title changed, this action will be ignored.

- title : formatted `[{issue number}] {issue title}`
- description
- member : github issue assignees to mapped by '**TRELLO_MEMBER_MAP**'
    - If there are no mapping data for assignee, it will do not join member.
- label : apply trello labes to match _label name_. case will be ignored

label or assignee change can be trigger this action.

#### move_card_to_done

If you want move Card to another list when issue closed, you can use this.      
this action requires secret '**TRELLO_DONE_LIST_ID**'    
If card title changed, this action will be ignored.

#### move_card_to_todo

When Reopen Issue, Move Card to TODO List that registered **TRELLO_TODO_LIST_ID**

#### archive_card

If you want remove Card when issue closed, you can use this.    
Card title starts with **`[{issue number}]`** will be archived(will not deleted)    
If card title changed, this action will be ignored.

### Comment Actions(on `issue_comment` event)

#### add_comment

When add new comment to issue, add same comment to trello card(with github comment link)  
comment on card has header like below.   
``
[ ${id} - Commented by ${github user login} on GitHub]
``

#### edit_comment

When comment edited, comment matched trello card will be change.


#### delete_comment

When comment delete, comment matched trello card will be delete.


### Example (workflow yml)

[Link](https://github.com/CyanRYi/trello-github-integration-test/tree/master/.github/workflows)