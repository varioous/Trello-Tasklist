var key = "XXXXXXXXX";

jQuery(document).ready(function () {
    AuthenticateTrello();
    var today = new Date();
    var content_height = 840;	// the height of the content, discluding the header/footer
    var page = 1;

    function buildPages() {
        if (jQuery('#printable-content').contents().length > 0) {
            $page = jQuery("#printable-invoice").clone().addClass("page").removeClass("template");

            $page.find("#footer .footer-center span").append(page);
            jQuery("body").append($page);
            page++;

            jQuery('#printable-content').columnize({
                columns: 1,
                target: ".page:last .content",
                overflow: {
                    height: content_height,
                    id: "#printable-content",
                    doneFunc: function () {
                        buildPages();
                    }
                }
            });

            jQuery('#printable-invoice').addClass('template');
            jQuery('#loader').remove();
        }
    }

    function AuthenticateTrello() {
        Trello.authorize({
            name: "varioous Print",
            type: "popup",
            interactive: true,
            expiration: "never",
            success: function () {
                onAuthorizeSuccessful();
            },
            error: function () {
                onFailedAuthorization();
            },
            scope: {write: true, read: true}
        });
    }

    function onAuthorizeSuccessful() {
        var token = Trello.token();
        var boards = [];
        var memberid;

        var loadData = new Promise(function (resolve, reject) {
            //get Memberdata
            jQuery.get("https://api.trello.com/1/members/me?key="+key+"&token=" + token, function (memberData) {
                memberid = memberData.id;
                jQuery('#name').text(memberData.fullName);
                //get Boarddata
                jQuery.get("https://api.trello.com/1/members/me/boards?key="+key+"&token=" + token, function (boardData) {
                    var cardPromises = [];
                    var labelPromises = [];
                    //gathering card data of board
                    for (var i = 0; i < boardData.length; i++) {
                        var board = boardData[i];
                        if (board.closed === false) {
                            cardPromises.push(loadCard(board.id, token));
                            labelPromises.push(loadLabel(board.id, token));
                            board.cards = [];
                            boards.push(board);
                        }
                    }

                    Promise.all(labelPromises).then(function (labelData) {
                        //call get card data
                        Promise.all(cardPromises).then(function (allData) {
                            allData.forEach(function (data) {
                                data.forEach(function (card) {
                                    //check if card is opened and card belongs to me

                                    if (card.closed === false
                                            && arrayContains(memberid, card.idMembers)
                                            && (card.idLabels[0] === undefined || getColorForLabel(labelData, card.idLabels) === 0)) {
                                        boards.forEach(function (board) {
                                            if (board.id === card.idBoard) {
                                                board.cards.push(card);
                                            }
                                        });
                                    }
                                });
                            });
                            resolve(boards);
                        });
                    });
                });
            });
        });

        //print data
        loadData.then(function (boardData) {
            var listPromises = [];

            //sort boards by board name
            boardData.sort(function (a, b) {
                if (a.name.toLowerCase() < b.name.toLowerCase()) {
                    return -1;
                } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                    return 1;
                }
                return 0;
            });


            boardData.forEach(function (board) {
                //loadList data
                board.cards.forEach(function (card) {
                    listPromises.push(loadList(card.id, token));
                });

                Promise.all(listPromises).then(function (allListData) {
                    if (board.cards.length !== 0) {
                        jQuery('#table-sec').append("<div id=\"table-header\"><p><span id=\"table-header-left\">" + board.name + "</span></p></div>");

                        var cardHtml = "<div id=\"table\"><table>";

                        if (board.cards !== undefined) {
                            board.cards.sort(function (a, b) {
                                if (a.due === null && b.due === null) {
                                    return 0;
                                }

                                if (a.due === null && b.due !== null) {
                                    return 1;
                                }

                                if (a.due !== null && b.due === null) {
                                    return -1;
                                }

                                if (a.due > b.due) {
                                    return 1;
                                } else if (a.due < b.due) {
                                    return -1;
                                }
                                return 0;
                            });
                        }

                        board.cards.forEach(function (card) {
                            var list = "";
                            var due = card.due;
                            if (due === null) {
                                due = "-";
                            } else {
                                var dueDate = new Date(due);
                                due = dueDate.toLocaleDateString();
                            }
                            allListData.forEach(function (listItem) {
                                if (listItem.id === card.idList) {
                                    list = listItem.name;
                                }
                            });

                            cardHtml = cardHtml + "<tr><td class=\"table-font\" colspan=\"2\">" + card.name + "</td><td class=\"td-right table-font\">" + list + "</td><td class=\"td-right table-font\">" + due + "</td></tr>";

                        });
                        cardHtml = cardHtml + "</table></div>";
                        jQuery('#table-sec').append(cardHtml);
                    }
                    if (board.id === boardData[boardData.length - 1].id) {
                        buildPages();
                    }

                });
            });
        });
    }

    function sortBoardsByName(boardData) {
        var sortedBoardData = [];
        return sortedBoardData;
    }

    //load card promise
    function loadCard(boardId, token) {
        return new Promise(function (resolve, reject) {
            jQuery.get("https://api.trello.com/1/boards/" + boardId + "/cards?key="+key+"&token=" + token, function (cardData) {
                resolve(cardData);
            });
        });
    }

    //load label data
    function loadLabel(boardId, token) {
        return new Promise(function (resolve, reject) {
            jQuery.get("https://api.trello.com/1/boards/" + boardId + "/labels?key="+key+"&token=" + token, function (labelData) {
                resolve(labelData);
            });
        });
    }

    //load list data for card promise
    function loadList(cardId, token) {
        return new Promise(function (resolve, reject) {
            jQuery.get("https://api.trello.com/1/cards/" + cardId + "/list?key="+key+"&token=" + token, function (listData) {
                resolve(listData);
            });
        });
    }

    function onFailedAuthorization() {
        // whatever
    }

    function arrayContains(needle, arrhaystack) {
        return (arrhaystack.indexOf(needle) > -1);
    }

    function getColorForLabel(allLabel, labelId) {
        for (var i = allLabel.length; i--; ) {
            var labels = allLabel[i];
            for (var j = labels.length; j--; ) {
                var label = labels[j];
                if (label.id === labelId[0]) {
                    if (label.color === "green") {
                        return 1;
                    } else {
                        return 0;
                    }
                }
            }
        }
        return 0;
    }

    jQuery('#date-col').text(today.toLocaleDateString());
});
