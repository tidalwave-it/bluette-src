/*
 * Written by Fabrizio Giudici.
 * Inspired from code by Marco Kuiper (http://www.marcofolio.net/)
 */

var slideshowSpeed = 8000;
var photoPrefix = "/media/stillimages/";
var photos = new Array();
var availWidth  = 1000;
var availHeight = 664;
var border = 10;
var sizes = [1920, 1280, 800];
var home = "/blog/";

$(document).ready(function() 
  {
    var interval = null;
    var activeContainer = 1;	
    var currentContainer = 2;	
    var currentPhotoIndex = -1;
    var animating = false;
    var baseUrl = location.href.replace(/#.*/, "");
    var urlId = location.href.replace(/.*#/, "");
    var currentZindex = -1;
    var playing = true;
    var schedulerTimer = null;

    var setupNavigationWidgets = function()
      {
        $("#navigationPreviousWidget").click(function()
          {
            changePhoto(-1);
          });

        $("#navigationNextWidget").click(function()
          {
            changePhoto(+1);
          });

        $("#navigationHomeWidget").click(function()
          {
            location.href = home; 
          });

        $("#navigationPlayWidget").click(function()
          {
            if (!playing)
              {
                playing = true;
                setWidgetsVisibility();
                scheduleNextSlide(0);
              }
          });

        $("#navigationPauseWidget").click(function()
          {
            if (playing)
              {
                playing = false;
                setWidgetsVisibility();
                $("#waitingWidget").fadeOut();

                if (schedulerTimer != null)
                  {
                    cancelTimer(schedulerTimer);
                    schedulerTimer = null;
                  }
              }
          });

        setWidgetsVisibility();
      }

    var setWidgetsVisibility = function()
      {
        showWidget("#navigationPreviousWidget", true);
        showWidget("#navigationNextWidget", true);
        showWidget("#navigationHomeWidget", true);
        showWidget("#navigationPlayWidget", !playing);
        showWidget("#navigationPauseWidget", playing);
      }

    var resize = function()
      {
        availWidth  = Math.round($(window).width()  * 1.0);
        availHeight = Math.round($(window).height() * 0.85);
        border = Math.max(Math.round(availWidth * 10 / 1920), 2);

        $("#divimage1").css({ "width"  : availWidth, "height" : availHeight });
        $("#divimage2").css({ "width"  : availWidth, "height" : availHeight });
        $("#page").css({ "margin-top" : -Math.round(availHeight / 2) });

        if (currentPhotoIndex >= 0)
          {
            resizePhoto(photos[currentPhotoIndex], activeContainer);
          }
      }

    var parseCatalog = function(xml)
      {
        var index = 0;

        $(xml).find("album > img").each(function()
          {
            var name    = $(this).attr("src").replace(/\..*/, "");
            var caption = $(this).attr("title");
            var info    = $(this).attr("caption");
            photos.push({ "name" : name, "caption" : caption, "info" : info });

            if (name == urlId)
              {
                currentPhotoIndex = index - 1;
              }
 
            index++; 
          });

        scheduleNextSlide(0);
      }

    var loadCatalog = function()
      {
        $.ajax(
          {
            type     : "GET",
            url      : "images3.xml",
            datatype : "xml",
            success  : parseCatalog
          });
      }

    var hideInitialWaitingWidget = function()
      {
        $("#imageOverlay").css(
          {
            "background" : "none"
          });
      }

    var changePhoto = function (direction) 
      {
        if (!animating) 
          {
            currentContainer = activeContainer;
            activeContainer = 3 - activeContainer;
            currentPhotoIndex = (currentPhotoIndex + direction) % photos.length;
            showPhoto(currentPhotoIndex, currentContainer, activeContainer);
          }
      };

    var resizePhoto = function (photo, container)
      {
        var width  = availWidth - border * 2;
        var scale  = Math.min(width / photo.width, 1);

        if (photo.height * scale > availHeight)
          {
            height = availHeight - border * 2;
            scale  = Math.min(height / photo.height, 1);
          }

        width  = Math.round(photo.width  * scale);
        height = Math.round(photo.height * scale);

        var left = Math.round((availWidth  - border * 2 - width)  / 2);
        var top  = Math.round((availHeight - border * 2 - height) / 2);

        $("#image" + container).css(
          { 
            "left"         : left, 
            "top"          : top, 
            "width"        : width, 
            "height"       : height, 
            "border-width" : border 
          });

        $("#imageOverlay").css(
          { 
            "left"         : left + border, 
            "top"          : top + border, 
            "width"        : width,
            "height"       : height 
          });

        //var captionFontSize = Math.max(Math.round(Math.max(width, height) * 27 / 1280), 6);
        var captionFontSize = Math.max(Math.round(availWidth * 25 / 1280), 6);
        $("#caption" + container).css(
          { 
            "left"         : left, 
            "top"          : top + height + border * 2 + border, 
            "width"        : width + 2 * border, 
            "font-size"    : captionFontSize 
          });
      }

    var showPhoto = function (index, currentContainer, activeContainer) 
      {
        var photo = photos[index];
        var neededSize = Math.max(availWidth - 2 * border, availHeight - 2 * border);
        var loadedSize = sizes[0];

        $(sizes).each(function()
          {
            if (neededSize <= this)
              {
                loadedSize = this;
              }
          });

//console.log("neededSize : " + neededSize + " loadedSize: " + loadedSize);
        if (!$(photo).attr('loaded' + loadedSize))
          {
            showWidget("#loadingWidget", true);
            var id = photo.name;
            $(photo).attr('id', id);

            $(sizes).each(function()
              {
                var url = photoPrefix + this + "/" + photo.name + ".jpg";
                $(photo).attr('url' + this, url);
              });

//console.log("Preloading " + loadedSize);

            $('<img/>').attr('src', $(photo).attr('url' + loadedSize)).load(function()
              {
                $(photo).attr('loaded' + loadedSize, true)
                        .attr('width',               this.width)
                        .attr('height',              this.height);

                showPhoto(index, currentContainer, activeContainer);
              });
          }

        else
          {
            hideInitialWaitingWidget();
            resizePhoto(photo, activeContainer);
            animating = true;
            currentZindex--;

            var url = $(photo).attr('url' + loadedSize);
//console.log("Using " + url);
            $("#image" + activeContainer).attr('src', url);

            $("#divimage" + activeContainer).css(
              {
                "display" : "block",
                "z-index" : currentZindex
              });

            showWidget("#loadingWidget", false);
//            showWidget("#waitingWidget", true);
            $("#caption" + currentContainer).fadeOut();
            $("#divimage" + currentContainer).fadeOut(function() 
              {
                location.href = baseUrl + "#" + photo.id;
                setTimeout(function() 
                  {
                    animating = false;
                    var caption = "" + (index + 1) + " / " + photos.length;

                    if (photo.caption != null)
                      {
                        caption = caption + " - " + photo.caption;
                      }

                    $("#caption" + activeContainer).text(caption);
                    $("#caption" + activeContainer).fadeIn();

                    if (playing)
                      {
                        scheduleNextSlide(slideshowSpeed);
                      }
                  }, 500);
              });
          }
      };

    var scheduleNextSlide = function (delay)
      {
        if (delay > 100)
          {
            $("#waitingWidget").fadeIn();
          }

        schedulerTimer = setTimeout(function() 
          { 
            if (playing) // sometimes the timer doesn't get cancelled
              {
                showWidget("#waitingWidget", false);
                changePhoto(+1);
              }
          }, delay);
      }

    var showWidget = function (widget, status)
      {
        //$(widget).css({ "display" : status ? "block" : "none" });
        $(widget).css({ "display" : status ? "inline" : "none" });
      }

    setupNavigationWidgets();
    resize();
    $(window).resize(resize); 
    loadCatalog();
  });
