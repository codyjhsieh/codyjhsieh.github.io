// console.log('hi');
$(document).ready(function(){

   var newHash      = "",
     $mainContent = $("#main-content"),
     $el;

   //Navigation Handler
   $(".navLink").click(function(){
      window.location.hash = $(this).attr("href");
      return false;
   });

   $(window).bind('hashchange', function(){

     newHash = window.location.hash.substring(1);
     
     if (newHash) {
         $mainContent
             .find(".exampleList")
             .fadeOut(200, function() {
                 $mainContent.hide().load(newHash + " .exampleList", function() {
                     $mainContent.fadeIn(200);
                     $("a.navLink").removeClass('selected')
                     $("a.navLink[href='"+newHash+"']").addClass('selected')
                 });
             });
     };
     
   });
    
   $(window).trigger('hashchange');

   //Color background scroll event
   $(".photoScroll").scroll(function(){
   if ($(this).scrollLeft() > 2000) {
      $('#rectangle').addClass('colorFive')
      $('#rectangle').removeClass('colorFour')
   }
   else if ($(this).scrollLeft() > 1700) {
      $('#rectangle').addClass('colorFour')
      $('#rectangle').removeClass('colorThree')
      $('#rectangle').removeClass('colorFive')
   }
   else if ($(this).scrollLeft() > 1100) {
      $('#rectangle').addClass('colorThree')
      $('#rectangle').removeClass('colorTwo')
      $('#rectangle').removeClass('colorFour')
   }
   else if ($(this).scrollLeft() > 300) {
      $('#rectangle').addClass('colorTwo')
      $('#rectangle').removeClass('colorThree')
      $('#rectangle').removeClass('colorOne')
   }
   else if ($(this).scrollLeft() > 0) {
      $('#rectangle').addClass('colorOne')
      $('#rectangle').removeClass('colorTwo')
   }
   });


});