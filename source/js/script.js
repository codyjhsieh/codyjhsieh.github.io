// console.log('hi');
$(document).ready(function(){
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
   //Navigation handler
   $(".navLink").click(function(){
      $("a.navLink").removeClass('selected')
      $(this).addClass('selected')

      //Example list handler
      // $('.exampleList').addClass('shown')
      // $('#' + $(this).text() + 'List').removeClass('shown')
      console.log('#' + $(this).text() + 'List')
      
      $('.exampleList').fadeOut('fast', function(){
         $('.exampleList').replace('#' + $(this).text() + 'List').fadeIn('fast');
      });

      if($(this).text() == 'projects') {
         $('.headBox').addClass('softwareBox')
      }
      else {
         $('.headBox').removeClass('softwareBox')
      }
   })

});