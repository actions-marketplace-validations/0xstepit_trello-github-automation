# trello-github-actions
You can link GitHub Issues and Pull Request with Trello card.

## Setting Up Environment(Repository Secret)

1. Access [Trello API key Page](https://trello.com/app-key) and Copy "Key'
- Paste text into repository secret value with key '**TRELLO_API_KEY**'

2. Click '_Token_' link below API key.(and Copy that)
- Paste text into repository secret value with key '**TRELLO_API_TOKEN**'
- You can find your '_Name_' and '_Username_' field in next page, keep your username.

3. Call API 'GET https://trello.com/1/member/{username}/boards?fields=name&key={apiKey}&token={apiToken}'
- Choose a Board to link your Repository(Link to Multiple Boards is not Supports)
- Add _board id_ into repository secret value with key '**TRELLO_BOARD_ID**'

4. Call API 'GET https://trello.com/1/boards/{boardId}/lists?fields=name&key={apiKey}&token={apiToken}'
- Choose a List to Add card when github Issue Created, Add _list id_ into repository secret value with key '**TRELLO_TODO_LIST_ID**'
- (Optional) If you want to move card to another list when issue closed, Add _list id_ into repository secret value with key '**TRELLO_DONE_LIST_ID**'

5. To Link Github Member and Trello User, Add Mapping information with secret key '**TRELLO_MEMBER_MAP**'.
- Array that contains String that "{github_login}:{trello_username}"
- ex) ["gh_login:trello_username", "gh_login2:trello_username2"]


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

### Developer

Cyan Raphael Yi(cyan.yi@sollabs.tech)