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

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
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

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var setWidgetsVisibility = function()
      {
        showWidget("#navigationPreviousWidget", true);
        showWidget("#navigationNextWidget", true);
        showWidget("#navigationHomeWidget", true);
        showWidget("#navigationPlayWidget", !playing);
        showWidget("#navigationPauseWidget", playing);
      }

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
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

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var parseCatalog = function (xml)
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

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
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

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var hideInitialWaitingWidget = function()
      {
        $("#imageOverlay").css({ "background" : "none" });
      }

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var changePhoto = function (direction) 
      {
        if (!animating) 
          {
            currentContainer = activeContainer;
            activeContainer = 3 - activeContainer;
            currentPhotoIndex = (currentPhotoIndex + direction) % photos.length;
            showCurrentPhoto();
          }
      };

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var computeBestSize = function (photo, container)
      {
        var width  = container.width - border * 2;
        var scale  = Math.min(width / photo.width, 1);

        if (photo.height * scale > container.height)
          {
            height = container.height - border * 2;
            scale  = Math.min(height / photo.height, 1);
          }

        var size = 
          { 
            width  : Math.round(photo.width  * scale),
            height : Math.round(photo.height * scale) 
          };
          
        return size;
      }

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var resizePhoto = function (photo, container)
      {
        var size = computeBestSize(photo, 
          { 
            width  : availWidth - border * 2,
            height : availHeight - border * 2 
          });

        var left = Math.round((availWidth  - border * 2 - size.width)  / 2);
        var top  = Math.round((availHeight - border * 2 - size.height) / 2);

        $("#image" + container).css(
          { 
            "left"         : left, 
            "top"          : top, 
            "width"        : size.width, 
            "height"       : size.height, 
            "border-width" : border 
          });

        $("#imageOverlay").css(
          { 
            "left"         : left + border, 
            "top"          : top + border, 
            "width"        : size.width,
            "height"       : size.height 
          });

        $("#caption" + container).css(
          { 
            //"left"         : size.left, 
            //"width"        : size.width + 2 * border, 
            "left"         : 0, 
            "width"        : availWidth,
            "top"          : top + size.height + border * 2 + border, 
            //var captionFontSize = Math.max(Math.round(Math.max(size.width, size.height) * 27 / 1280), 6)
            "font-size"    : Math.max(Math.round(availWidth * 25 / 1280), 6)
          });
      }  

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var getPhotoUrl = function (photo, size)
      {
        return photoPrefix + size + "/" + photo.name + ".jpg";
      }
      
    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var computeMediaSize = function (neededSize)
      {
        var loadedSize = sizes[0];

        $(sizes).each(function()
          {
            if (neededSize <= this)
              {
                loadedSize = this;
              }
          });

        return loadedSize;
      }
      
    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var showCurrentPhoto = function() 
      {
        var photo = photos[currentPhotoIndex];
        var neededSize = Math.max(availWidth - 2 * border, availHeight - 2 * border);
        var mediaSize = computeMediaSize(neededSize);

//console.log("neededSize : " + neededSize + " loadedSize: " + loadedSize);
        if (!$(photo).attr('loaded' + mediaSize))
          {
            showWidget("#loadingWidget", true);
            $(photo).attr('id', photo.name);

            $(sizes).each(function()
              {
                $(photo).attr('url' + this, getPhotoUrl(photo, this));
              });

//console.log("Preloading " + loadedSize);

            $('<img/>').attr('src', $(photo).attr('url' + mediaSize)).load(function()
              {
                $(photo).attr('loaded' + mediaSize, true)
                        .attr('width',              this.width)
                        .attr('height',             this.height);

                showCurrentPhoto();
              });
          }

        else
          {
            hideInitialWaitingWidget();
            resizePhoto(photo, activeContainer);
            animating = true;
            currentZindex--;

            var url = $(photo).attr('url' + mediaSize);
//console.log("Using " + url);
            $("#image" + activeContainer).attr('src', url);

            $("#divimage" + activeContainer).css(
              {
                "display" : "block",
                "z-index" : currentZindex
              });

            showWidget("#loadingWidget", false);
            $("#caption" + currentContainer).fadeOut();
            $("#divimage" + currentContainer).fadeOut(function() 
              {
                location.href = baseUrl + "#" + photo.id;
                setTimeout(function() 
                  {
                    animating = false;

                    $("#caption" + activeContainer).text(getCurrentCaption()).fadeIn();

                    if (playing)
                      {
                        scheduleNextSlide(slideshowSpeed);
                      }
                  }, 500);
              });
          }
      };

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var getCurrentCaption = function()
      {
        var photo = photos[currentPhotoIndex];
        var caption = "" + (currentPhotoIndex + 1) + " / " + photos.length;

        if (photo.caption != null)
          {
            caption = caption + " - " + photo.caption;
          }

        return caption;
      }

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
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

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var showWidget = function (widget, status)
      {
        //$(widget).css({ "display" : status ? "block" : "none" });
        $(widget).css({ "display" : status ? "inline" : "none" });
      }

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    setupNavigationWidgets();
    resize();
    $(window).resize(resize); 
    loadCatalog();
  });

