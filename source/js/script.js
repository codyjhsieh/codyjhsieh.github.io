// console.log('hi');
$(document).ready(function() {

    $(".listItem").hide();

    var newHash = "",
        $mainContent = $("#main-content"),
        $el;

    //Navigation Handler
    $(".navLink").click(function() {
        window.location.hash = $(this).attr("href").slice(0, -5);
        return false;
    });

    $(window).bind('hashchange', function() {

        newHash = window.location.hash.substring(1);

        if (newHash) {
            $("a.navLink").removeClass('selected')
            $("a.navLink[href='" + newHash + ".html']").addClass('selected')

            $mainContent.find(".exampleList").fadeOut(500, function() {
                $mainContent.load(newHash + ".html .exampleList", function() {
                    $(".listItem").hide();
                    $mainContent.find(".exampleList").scroll(function() {
                        console.log($(this).scrollLeft());
                        if ($(this).scrollLeft() > 2000) {
                            $('#rectangle').addClass('colorFive')
                            $('#rectangle').removeClass('colorFour')
                        } else if ($(this).scrollLeft() > 1700) {
                            $('#rectangle').addClass('colorFour')
                            $('#rectangle').removeClass('colorThree')
                            $('#rectangle').removeClass('colorFive')
                        } else if ($(this).scrollLeft() > 1100) {
                            $('#rectangle').addClass('colorThree')
                            $('#rectangle').removeClass('colorTwo')
                            $('#rectangle').removeClass('colorFour')
                        } else if ($(this).scrollLeft() > 300) {
                            $('#rectangle').addClass('colorTwo')
                            $('#rectangle').removeClass('colorThree')
                            $('#rectangle').removeClass('colorOne')
                        } else if ($(this).scrollLeft() > 0) {
                            $('#rectangle').addClass('colorOne')
                            $('#rectangle').removeClass('colorTwo')
                        }
                    });
                    $(".listItem").each(function(i) {
                        $(this).delay((i + 1) * 250).fadeIn();
                    });
                    if (newHash == "index") {
                        var classList = document.getElementById('rectangle').className.split(/\s+/);
                        for (var i = 0; i < classList.length; i++) {
                            if (classList[i] != 'colorRectangle') {
                                $('#rectangle').removeClass(classList[i]);
                            }
                        }
                        $('#rectangle').addClass('colorOne')
                    }
                    if (newHash != "index") {
                        const tilt = $('.headBox').tilt();
                        // Reset instance
                        tilt.tilt.reset.call(tilt);

                        $(".headBox").addClass('softwareBoxAfter')
                        $(".colorRectangle").addClass('softwareBoxAfter')
                        $(".listItem").addClass('softwareBoxAfter')

                        var classList = document.getElementById('rectangle').className.split(/\s+/);
                        for (var i = 0; i < classList.length; i++) {
                            if (classList[i] != 'colorRectangle') {
                                $('#rectangle').removeClass(classList[i]);
                            }
                        }
                        $('#rectangle').addClass('colorFour')
                    }
                    else {
                        const tilt = $('.headBox').tilt();
                        // Destroy instance
                        tilt.tilt.destroy.call(tilt);

                        $(".headBox").removeClass('softwareBoxAfter')
                        $(".colorRectangle").removeClass('softwareBoxAfter')
                        $("listItem").removeClass('softwareBoxAfter')
                    }
                });
                // $mainContent.hide();
            });
            console.log(newHash + ".html .exampleList");
        };

    });

    $(window).trigger('hashchange');

    newHash = window.location.hash.substring(1);
    //Color background scroll event
    $(".exampleList").scroll(function() {
        if ($(this).scrollLeft() > 2000) {
            $('#rectangle').addClass('colorFive')
            $('#rectangle').removeClass('colorFour')
        } else if ($(this).scrollLeft() > 1700) {
            $('#rectangle').addClass('colorFour')
            $('#rectangle').removeClass('colorThree')
            $('#rectangle').removeClass('colorFive')
        } else if ($(this).scrollLeft() > 1100) {
            $('#rectangle').addClass('colorThree')
            $('#rectangle').removeClass('colorTwo')
            $('#rectangle').removeClass('colorFour')
        } else if ($(this).scrollLeft() > 300) {
            $('#rectangle').addClass('colorTwo')
            $('#rectangle').removeClass('colorThree')
            $('#rectangle').removeClass('colorOne')
        } else if ($(this).scrollLeft() > 0) {
            $('#rectangle').addClass('colorOne')
            $('#rectangle').removeClass('colorTwo')
        }
    });
});
$(window).on('load', function() {
    $(".listItem").each(function(i) {
        $(this).delay((i + 1) * 250).fadeIn();
    });
});