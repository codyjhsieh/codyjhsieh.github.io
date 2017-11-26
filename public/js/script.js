// console.log('hi');
$(document).ready(function(){
    $(".photoScroll").scroll(function(){
      if ($(this).scrollLeft() > 1700) {
         $('#rectangle').addClass('colorFive')
         $('#rectangle').removeClass('colorFour')
      }
      else if ($(this).scrollLeft() > 1400) {
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