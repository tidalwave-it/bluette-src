/***********************************************************************************************************************************
 *
 * bluette - open source media presentation
 * ========================================
 *
 * Copyright (C) 2010 by Fabrizio Giudici
 * Project home page: http://bluette.kenai.com
 *
 ***********************************************************************************************************************************
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations under the License.
 *
 ***********************************************************************************************************************************
 *
 * $Id: $
 *
 **********************************************************************************************************************************/

/***********************************************************************************************************************************
 *
 * Inspired from code by Marco Kuiper (http://www.marcofolio.net/)
 * FIXME: don't store width, height in photo, only the aspect ratio
 *
 **********************************************************************************************************************************/

var photoPrefix = "/media/stillimages/";
var home = "/blog/";
var slideshowSpeed = 8000;
var sizes = [1920, 1280, 800, 400, 200];
var thumbnailsPerRow = 10;

$(document).ready(function() 
  {
    var photos = new Array();
    var activeContainer = 1;	
    var currentContainer = 2;	
    var currentPhotoIndex = -1;
    var currentZindex = -1;
    var availWidth  = 1000;
    var availHeight = 664;
    var border = 10;
    var animating = false;
    var baseUrl = location.href.replace(/#.*/, "");
    var initialPhotoId = location.href.replace(/.*#/, "");
    var playing = initialPhotoId != "lightbox";
    var schedulerTimer = null;
    var thumbnailsLoaded = false;

    /*******************************************************************************************************************************
     *
     * Binds the navigation widgets to the related controller functions.
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

        $("#navigationCloseWidget").click(closeLightBox);
        $("#navigationLightBoxWidget").click(openLightBox);
        $("#navigationHomeWidget").click(goHome);
        $("#navigationPlayWidget").click(play);
        $("#navigationPauseWidget").click(pause);

        updateWidgetsVisibility();
      }
      
    /*******************************************************************************************************************************
     *
     * Opens the LightBox.
     *
     ******************************************************************************************************************************/
    var openLightBox = function()
      {
        pause();
        $("#slideshow").fadeOut(new function()
          {
            setTimeout(function() 
              {
                location.href = baseUrl + "#lightbox";

                $("#lightbox").fadeIn(new function()
                  {
                    if (!thumbnailsLoaded)
                      {
                        setTimeout(function() 
                          {
                            loadThumbnails();
                          }, 500);
                      }
                  });
              }, 500);
          });
      }

    /*******************************************************************************************************************************
     *
     * Loads the thumbnail in the LightBox. Images are loaded in background and rendered as they are ready.
     *
     ******************************************************************************************************************************/
    var loadThumbnails = function()
      {
        var mediaSize = availWidth / thumbnailsPerRow;
        thumbnailsLoaded = true;
        var index = 0;
        
        $(photos).each(function()
          {
            var range = 5;
            var angle = Math.random() * range * 2 - range + 'deg';    
            var theIndex = index;
            var url = getPhotoUrl(this, computeMediaSize(mediaSize));
            
            $('<img/>').attr('src', url)
                       .css(
                          {
                           '-webkit-transform' : 'rotate(' + angle + ')',
                           '-moz-transform'    : 'rotate(' + angle + ')',
                           'display'           : 'none'
                          })
                       .appendTo($("#thumbnails"))
                       .click(function()
                         {
                           if (currentPhotoIndex != theIndex)
                             {
                               // FIXME: reset the slideshow so the previous photo is not shown
                               // FIXME: if the new photo is not ready, show again the initial waiting widget
                               currentPhotoIndex = theIndex;
                             }

                           // FIXME: use the scheduler instead
                           showCurrentPhoto();
                           updateUrl();
                           // END FIXME
                           //scheduleNextSlide(0);
                           closeLightBox();
                         })
                       .load(function()
                         {
                           var size = computeLargestFittingSize(this, 
                             { 
                               width  : mediaSize,
                               height : mediaSize 
                             });
                             
                           $(this).attr('width', size.width).attr('height', size.height).fadeIn();
                         });              

            index++;
          });
      }
    
    /*******************************************************************************************************************************
     *
     * Closes the LightBox.
     *
     ******************************************************************************************************************************/
    var closeLightBox = function()
      {
        $("#lightbox").fadeOut(new function()
          {
            setTimeout(function() 
              {
                if (currentPhotoIndex < 0)
                  {
                    currentPhotoIndex = 0;
                  }
                  
                updateUrl();
                scheduleNextSlide(0);
                $("#slideshow").fadeIn(); // FIXME: postpone when the first photo is rendered
              }, 500);
          });
      }

    /*******************************************************************************************************************************
     *
     * Update the Url with the current photo id.
     *
     ******************************************************************************************************************************/
    var updateUrl = function()
      {
        location.href = baseUrl + "#" + photos[currentPhotoIndex].id;                    
      }
      
    /*******************************************************************************************************************************
     *
     * Goes to the home page.
     *
     ******************************************************************************************************************************/
    var goHome = function()
      {
        $("#slideshow").fadeOut(new function()
          {
            setTimeout(function() 
              {
                location.href = home; 
              }, 500);
          });
      }
      
    /*******************************************************************************************************************************
     *
     * Starts playing the slideshow.
     *
     ******************************************************************************************************************************/
    var play = function()
      {
        if (!playing)
          {
            playing = true;
            updateWidgetsVisibility();
            scheduleNextSlide(0);
          }
      }
      
    /*******************************************************************************************************************************
     *
     * Stops the slideshow.
     *
     ******************************************************************************************************************************/
    var pause = function()
      {
        if (playing)
          {
            playing = false;
            updateWidgetsVisibility();
            $("#waitingWidget").fadeOut();

            if (schedulerTimer != null)
              {
                clearTimeout(schedulerTimer);
                schedulerTimer = null;
              }
          }
      }
      
    /*******************************************************************************************************************************
     *
     * Changes the vidgets visibility in fuction of the current status.
     *
     ******************************************************************************************************************************/
    var updateWidgetsVisibility = function()
      {
        showWidget("#navigationPreviousWidget", true);
        showWidget("#navigationNextWidget", true);
        showWidget("#navigationHomeWidget", true);
        showWidget("#navigationPlayWidget", !playing);
        showWidget("#navigationPauseWidget", playing);
      }

    /*******************************************************************************************************************************
     *
     * Resizes the view in function of the available space.
     *
     ******************************************************************************************************************************/
    var fitPhotoView = function()
      {
        availWidth  = Math.round($(window).width()  * 1.0);
        availHeight = Math.round($(window).height() * 0.85);
        border = Math.max(Math.round(availWidth * 10 / 1920), 2);

        $("#divimage1").css({"width"  : availWidth, "height" : availHeight});
        $("#divimage2").css({"width"  : availWidth, "height" : availHeight});
        $("#page").css({"margin-top" : -Math.round(availHeight / 2)});

        if (currentPhotoIndex >= 0)
          {
            fitPhoto(photos[currentPhotoIndex], activeContainer);
          }
      }

    /*******************************************************************************************************************************
     *
     * Loads the catalog of photos.
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
            photos.push({"name" : name, "caption" : caption, "info" : info});

            if (name == initialPhotoId)
              {
                currentPhotoIndex = index - 1;
              }
 
            index++; 
          });

        if (initialPhotoId === "lightbox")
          {
            openLightBox();
          }
        else
          {
            scheduleNextSlide(0);
            $("#slideshow").fadeIn(); // FIXME: postpone when the first photo is rendered
          }
      }

    /*******************************************************************************************************************************
     *
     * Retrieves the catalog of photos.
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
        $("#imageOverlay").css({"background" : "none"});
      }

    /*******************************************************************************************************************************
     *
     * Changes the current photo, according to the given direction (-1 = backward, +1 = forward).
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
     * Computes the largest fitting size of a component to be rendered within a container, preserving the aspect ratio.
     *
     ******************************************************************************************************************************/
    var computeLargestFittingSize = function (component, container)
      {
        var width  = container.width - border * 2;
        var scale  = Math.min(width / component.width, 1);

        if (component.height * scale > container.height)
          {
            height = container.height - border * 2;
            scale  = Math.min(height / component.height, 1);
          }

        var size = 
          { 
            width  : Math.round(component.width  * scale),
            height : Math.round(component.height * scale) 
          };
          
        return size;
      }

    /*******************************************************************************************************************************
     *
     * Resizes the photo renderer to fit in the available space.
     *
     ******************************************************************************************************************************/
    var fitPhoto = function (photo, containerIndex)
      {
        var size = computeLargestFittingSize(photo, 
          { 
            width  : availWidth - border * 2,
            height : availHeight - border * 2 
          });

        var left = Math.round((availWidth  - border * 2 - size.width)  / 2);
        var top  = Math.round((availHeight - border * 2 - size.height) / 2);

        $("#image" + containerIndex).css(
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

        $("#caption" + containerIndex).css(
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
     * Show the current photo. The caption is faded in after a short delay. If the needed photo has not been loaded yet, the 
     * loadingWidget is shown and the image is loaded before rendering.
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
            $(photo).attr('id', photo.name); // TODO: this can be moved to initialization

            $(sizes).each(function() // TODO: this can be moved to initialization
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
            fitPhoto(photo, activeContainer);
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
                updateUrl();
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
     * Computes the caption for the current photo.
     *
     ******************************************************************************************************************************/
    var getCurrentCaption = function()
      {
        var photo = photos[currentPhotoIndex];
        var caption = "" + (currentPhotoIndex + 1) + " / " + photos.length;

        if (photo.caption != null && photo.caption != "")
          {
            caption = caption + " - " + photo.caption;
          }

        return caption;
      }

    /*******************************************************************************************************************************
     *
     * Schedules the next slide to be rendered within the given delay.
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
            showWidget("#waitingWidget", false);
            changePhoto(+1);
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
        $(widget).css({"display" : status ? "inline" : "none"});
      }

    /*******************************************************************************************************************************
     *
     * Initialization.
     *
     ******************************************************************************************************************************/
    setupNavigationWidgets();
    fitPhotoView();
    $(window).resize(fitPhotoView); 
    loadCatalog();
  });

