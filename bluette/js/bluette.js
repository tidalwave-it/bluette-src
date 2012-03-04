/***********************************************************************************************************************************
 *
 * bluette - open source media presentation
 * ========================================
 *
 * Copyright (C) 2010-2012 by Fabrizio Giudici
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
 * $Id$
 *
 **********************************************************************************************************************************/

/***********************************************************************************************************************************
 *
 * @author  Fabrizio Giudici
 *
 * Inspired by code by Marco Kuiper (http://www.marcofolio.net/) 
 *
 * FIXME: don't store width, height in photo, only the aspect ratio
 *
 **********************************************************************************************************************************/
$(document).ready(function() 
  {
//    var bluetteCatalogUrl =                       bluetteCatalogUrl || "images.xml";
//    var bluettePhotoPrefix =                     bluettePhotoPrefix || "http://stoppingdown.net/media/stillimages/";
//    var bluetteHome =                                   bluetteHome || "/";
//    var bluetteTitlePrefix =                     bluetteTitlePrefix || "Bluette Demo: ";
//    var bluetteSlideshowSpeed =               bluetteSlideshowSpeed || 8000;
//    var bluettePhotoSizes =                       bluettePhotoSizes || [1280, 800, 400, 200];
//    var bluetteThumbnailsPerRow =           bluetteThumbnailsPerRow || 10;
//    var bluetteAvailWidthPercentage =  bluetteAvailHeightPercentage || 1.0;
//    var bluetteAvailHeightPercentage = bluetteAvailHeightPercentage || 0.85;
//    var bluetteBorderScale =                     bluetteBorderScale ||  6.0 / 1920.0;
//    var bluetteCaptionFontSizeScale =   bluetteCaptionFontSizeScale || 25.0 / 1280.0;
//    var bluetteHeaderFontSizeScale =     bluetteHeaderFontSizeScale || 40 / 1280.0;
//    var bluetteTitleVisible =                   bluetteTitleVisible || true;
//    var logging =                                           logging || false;

    var settings = 
      {
        showArrows: true
      };

    var scrollPane = $('#thumbnails')
    scrollPane.jScrollPane(settings);
    var scrollPaneApi = scrollPane.data('jsp');        

    var photos = [];
    var activeContainer = 1;	
    var currentContainer = 2;
    var currentPhotoIndex = -1;
    var currentZindex = -1;
    var availWidth;
    var availHeight;
    var border;
    var animating = false;
    var compatibilityUrl = location.href.replace(/#!\//, "#");
    var baseUrl = compatibilityUrl.replace(/#.*/, "");
    var initialStatus = compatibilityUrl.replace(/.*#/, "").replace(baseUrl, "");
    var playing = initialStatus === "";
    var schedulerTimer = null;
    var thumbnailsLoaded = false;
    var slideShowVisible = false;
 
    if (!playing)
      {
        location.href = compatibilityUrl.replace(/#/, "#!/");
      }
 
    /*******************************************************************************************************************************
     *
     * Binds the navigation widgets to the related controller functions.
     *
     ******************************************************************************************************************************/
    var setupNavigationWidgets = function()
      {
        info("setupNavigationWidgets()");
        
        $("#navigationPreviousWidget").click(slideBackward);
        $("#navigationNextWidget").click(slideForward);
        $("#navigationCloseWidget").click(closeLightBox);
        $("#navigationLightBoxWidget").click(openLightBox);
        $("#navigationHomeWidget").click(goHome);
        $("#navigationPlayWidget").click(play);
        $("#navigationPauseWidget").click(pause);

        $("#navigationPreviousWidget").removeAttr("href");
        $("#navigationNextWidget").removeAttr("href");
        $("#navigationLightBoxWidget").removeAttr("href");
        $("#navigationHomeWidget").removeAttr("href");
        $("#navigationCloseWidget").removeAttr("href");
        
        updateWidgetsVisibility();
      };
      
    /*******************************************************************************************************************************
     *
     * Moves to the next slide.
     *
     ******************************************************************************************************************************/
    var slideForward = function()
      {
        pause();
        changePhoto(+1);
      };
      
    /*******************************************************************************************************************************
     *
     * Moves to the next slide.
     *
     ******************************************************************************************************************************/
    var slideBackward = function()
      {
        pause();
        changePhoto(-1);
      };
      
    /*******************************************************************************************************************************
     *
     * Opens the LightBox.
     *
     ******************************************************************************************************************************/
    var openLightBox = function()
      {
        info("openLightBox()");
        pause();
        $("#slideshow").fadeOut(function()
          {
            setTimeout(function() 
              {
                slideShowVisible = false;
                $("#initialWaitingWidget").css({"display" : "none"});
                location.href = baseUrl + "#!/lightbox";

                $("#lightbox").fadeIn(function()
                  {
                    if (!thumbnailsLoaded)
                      {
                        setTimeout(loadThumbnails, 500);
                      }
                  });
              }, 500);
          });
      };

    /*******************************************************************************************************************************
     *
     * Loads the thumbnail in the LightBox. Images are loaded in background and rendered as they are ready.
     *
     ******************************************************************************************************************************/
    var loadThumbnails = function()
      {
        info("loadThumbnails()");
        var mediaSize = Math.round(availWidth / bluetteThumbnailsPerRow);
        thumbnailsLoaded = true;
        var index = 0;
        
        $(photos).each(function()
          {
            var thisIndex = index++;
            var url = getPhotoUrl(this, computeMediaSize(mediaSize));
            debug("Loading %s...", url);
            
            var img = $('<img/>').attr('src', url)
                                 .css({'display' : 'none'})
                                 .appendTo(scrollPaneApi.getContentPane())
                                 .click(function()
                                    {
                                      goToPhoto(thisIndex);
                                    });

            initializeThumbnail(img);
            img.load(function()
              {
                debug("Loaded %s...", this);
//                var size = computeLargestFittingSize(this, // works everywhere but IE
                var size = computeLargestFittingSize(
                  { 
                    width  : $(this).width(),
                    height : $(this).height()
                  },
                  { 
                    width  : mediaSize,
                    height : mediaSize 
                  });
 
                $(this).attr('width', size.width).attr('height', size.height).fadeIn();
                scrollPaneApi.reinitialise();
              });      
          });
      };
      
    /*******************************************************************************************************************************
     *
     * Performs specific thumbnail initialization.
     *
     ******************************************************************************************************************************/
    function initializeThumbnail (img)
      {
        var range = 5;
        var angle = Math.random() * range * 2 - range + 'deg';    
        img.css({
                  '-webkit-transform' : 'rotate(' + angle + ')',
                  '-moz-transform'    : 'rotate(' + angle + ')'
                });
      }
      
    /*******************************************************************************************************************************
     *
     * Goes to the specified photo.
     *
     ******************************************************************************************************************************/
    var goToPhoto = function (index)
      {
        info("goToPhoto(%d)", index);
        currentPhotoIndex = index;
        closeLightBox();
      };
    
    /*******************************************************************************************************************************
     *
     * Closes the LightBox.
     *
     ******************************************************************************************************************************/
    var closeLightBox = function()
      {
        info("closeLightBox()");
        $("#divimage" + activeContainer).css({"display" : "none"});
        $("#title" + activeContainer).css({"display" : "none"});
        $("#lightbox").fadeOut(function()
          {
            setTimeout(function() 
              {
                currentPhotoIndex = Math.max(currentPhotoIndex,  0) - 1; // scheduleNextSlide will increment it
                scheduleNextSlide(0);
              }, 500);
          });
      };

    /*******************************************************************************************************************************
     *
     * Update the Url with the current photo id.
     *
     ******************************************************************************************************************************/
    var updateUrl = function()
      {
        info("updateUrl()");
        location.href = baseUrl + "#!/" + photos[currentPhotoIndex].id;        
        document.title = bluetteTitlePrefix + getCurrentTitle();
      };
      
    /*******************************************************************************************************************************
     *
     * Goes to the bluetteHome page.
     *
     ******************************************************************************************************************************/
    var goHome = function()
      {
        info("goHome()");
        $("#slideshow").fadeOut(function()
          {
            setTimeout(function() 
              {
                location.href = bluetteHome; 
              }, 500);
          });
      };
      
    /*******************************************************************************************************************************
     *
     * Starts playing the slideshow.
     *
     ******************************************************************************************************************************/
    var play = function()
      {
        info("play() - playing: %s", playing);
        
        if (!playing)
          {
            playing = true;
            updateWidgetsVisibility();
            scheduleNextSlide(0);
          }
      };
      
    /*******************************************************************************************************************************
     *
     * Stops the slideshow.
     *
     ******************************************************************************************************************************/
    var pause = function()
      {
        info("pause() - playing: %s", playing);
        
        if (playing)
          {
            playing = false;
            updateWidgetsVisibility();
            $("#waitingWidget").fadeOut();

            if (schedulerTimer !== null)
              {
                clearTimeout(schedulerTimer);
                schedulerTimer = null;
              }
          }
      };
      
    /*******************************************************************************************************************************
     *
     * Changes the vidgets visibility in fuction of the current status.
     *
     ******************************************************************************************************************************/
    var updateWidgetsVisibility = function()
      {
        info("updateWidgetsVisibility()");
        showWidget("#navigationPreviousWidget", true);
        showWidget("#navigationNextWidget", true);
        showWidget("#navigationHomeWidget", true);
        showWidget("#navigationLightBoxWidget", true);
        showWidget("#navigationPlayWidget", !playing);
        showWidget("#navigationPauseWidget", playing);
      };

    /*******************************************************************************************************************************
     *
     * Resizes the view in function of the available space.
     *
     ******************************************************************************************************************************/
    var fitPhotoView = function()
      {
        info("fitPhotoView()");
        availWidth  = Math.round($(window).width()  * bluetteAvailWidthPercentage);
        availHeight = Math.round($(window).height() * bluetteAvailHeightPercentage);
        border = Math.max(Math.round(availWidth * bluetteBorderScale), 2);
        debug("available size: %d x %d, border: %d", availWidth, availHeight, border);

        var css = {"width"  : availWidth, "height" : availHeight};
        $("#initialWaitingWidget").css(css);
        $("#divimage1").css(css);
        $("#divimage2").css(css);
        $("#page").css({"margin-top" : -Math.round(availHeight / 2)});

        if (currentPhotoIndex >= 0)
          {
            fitPhoto(photos[currentPhotoIndex], activeContainer);
          }
          
        $("#thumbnails").css({"height" : availHeight})
      };

    /*******************************************************************************************************************************
     *
     * Loads the catalog of photos.
     *
     ******************************************************************************************************************************/
    var parseCatalog = function (xml)
      {
        info("parseCatalog() - ", xml);

        $(xml).find("stillImage").each(function(i, img)
          {
            var $img  = $(img);
            var id    = $img.attr("id");
            var title = $img.attr("title");
            var info  = $img.attr("caption");
            
            var photo = {"name" : id, "id" : id, "title" : title, "info" : info};
            
            $(bluettePhotoSizes).each(function()
              {
                $(photo).attr('url' + this, getPhotoUrl(photo, this));
              });

            photos.push(photo);
          });
          
        debug("loaded %s items", photos.length);
        
        if (bluetteShuffle)
          {
            $($.shuffle(photos));
          }
          
        $(photos).each(function(i, photo)
          {
            if (photo.id == initialStatus)
              {
                currentPhotoIndex = i; 
                debug("Initial photo index: %d", i);
              }
          });

        if (photos.length == 0)
          {
            fatal("Error: no photos in this slideshow");
          }
        else if (initialStatus === "lightbox")
          {
            openLightBox();
          }
        else
          {
            currentPhotoIndex = Math.max(currentPhotoIndex,  0) - 1; // scheduleNextSlide will increment it
            scheduleNextSlide(0);
          }
      };
      
    /*******************************************************************************************************************************
     *
     * Notifies a fatal error.
     *
     ******************************************************************************************************************************/
    var fatal = function (message)
      {
        $("#initialWaitingWidget").css({"display" : "none"});
        $("#content").append(message);
      };

    /*******************************************************************************************************************************
     *
     * Retrieves the catalog of photos.
     *
     ******************************************************************************************************************************/
    var loadCatalog = function()
      {
        info("loadCatalog()");
        debug("Loading %s", bluetteCatalogUrl);
        
        $.ajax(
          {
            type     : "GET",
            url      : bluetteCatalogUrl,
            datatype : "xml",
            success  : parseCatalog,
            error    : function (xmlHttpRequest, textStatus, errorThrown)
              {
                fatal("Cannot load the catalog: " + xmlHttpRequest.responseText);
              }
          });
      };

    /*******************************************************************************************************************************
     *
     * Changes the current photo, according to the given direction (-1 = backward, +1 = forward).
     *
     ******************************************************************************************************************************/
    var changePhoto = function (direction) 
      {
        info("changePhoto(%d) - animating: %s", direction, animating);
        
        if (!animating) 
          {
            currentContainer = activeContainer;
            activeContainer = 3 - activeContainer;
            // adding photos.length to avoid negative range
            currentPhotoIndex = (currentPhotoIndex + direction + photos.length) % photos.length;
            showCurrentPhoto();
          }
      };

    /*******************************************************************************************************************************
     *
     * Computes the largest fitting size of an image to be rendered within a container, preserving the aspect ratio.
     *
     ******************************************************************************************************************************/
    var computeLargestFittingSize = function (component, container)
      {
        info("computeLargestFittingSize(%d x %d, %d x %d)", component.width, component.height, container.width, container.height);
        
        var width = container.width - border * 2;
        var scale = Math.min(width / component.width, 1);

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
          
        debug("returning %d x %d", size.width, size.height);
          
        return size;
      };

    /*******************************************************************************************************************************
     *
     * Resizes the photo renderer to fit in the available space.
     *
     ******************************************************************************************************************************/
    var fitPhoto = function (photo, containerIndex)
      {
        info("fitPhoto(%s, containerIndex: %d)", photo.id, containerIndex);
        
        var size = computeLargestFittingSize(photo, 
          { 
            width  : availWidth - border * 2,
            height : availHeight - border * 2 
          });

        var left = Math.round((availWidth  - border * 2 - size.width)  / 2);
        var top  = Math.round((availHeight - border * 2 - size.height) / 2);
        
        debug("size: %d x %d, left: %d, top: %d", size.width, size.height, left, top);

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

        $("#title" + containerIndex).css(
          { 
            "left"         : 0, 
            "width"        : availWidth,
            "top"          : top + size.height + border * 2 + border, 
            "font-size"    : Math.max(Math.round(10 * availWidth * bluetteCaptionFontSizeScale), 6) / 10
          });
          
        $("#header").css(
          { 
            "font-size"    : Math.max(Math.round(10 * availWidth * bluetteHeaderFontSizeScale), 6) / 10
          });
      };

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var getPhotoUrl = function (photo, size)
      {
        return bluettePhotoPrefix + size + "/" + photo.name + ".jpg";
      };
      
    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var computeMediaSize = function (neededSize)
      {
        var loadedSize = bluettePhotoSizes[0];

        $(bluettePhotoSizes).each(function()
          {
            if (neededSize <= this)
              {
                loadedSize = this;
              }
          });

        return loadedSize;
      };
      
    /*******************************************************************************************************************************
     *
     * Show the current photo. The caption is faded in after a short delay. If the needed photo has not been loaded yet, the 
     * loadingWidget is shown and the image is loaded before rendering.
     *
     ******************************************************************************************************************************/
    var showCurrentPhoto = function() 
      {
        info("showCurrentPhoto() - currentPhotoIndex: %d", currentPhotoIndex);
        
        var photo = photos[currentPhotoIndex];
        var neededSize = Math.max(availWidth - 2 * border, availHeight - 2 * border);
        var mediaSize = computeMediaSize(neededSize);
        debug("neededSize: %d", neededSize);
        
        if (!$(photo).attr('loaded' + mediaSize))
          {
            debug("media sized %d not loaded yet", mediaSize);

            if (!slideShowVisible)
              {
                $("#initialWaitingWidget").fadeIn();
              }
              
            showWidget("#loadingWidget", true);

            var img = $('<img/>');
            img.attr('src', $(photo).attr('url' + mediaSize));
            img.load(function()
              {
                debug("media sized %d loaded", mediaSize);
                $(photo).attr('loaded' + mediaSize, true)
                        .attr('width',              this.width)
                        .attr('height',             this.height);
                showCurrentPhoto();
              });
          }

        else
          {
            debug("media sized %d already loaded", mediaSize);

            if (!slideShowVisible)
              {
                slideShowVisible = true;
                $("#slideshow").fadeIn(); 
                $("#initialWaitingWidget").css({"display" : "none"});
//                $("#initialWaitingWidget").fadeOut(); FIXME: gets moved up
              }
          
            fitPhoto(photo, activeContainer);
            animating = true;

            var url = $(photo).attr('url' + mediaSize);
            $("#image" + activeContainer).attr('src', url);

            $("#divimage" + activeContainer).css(
              {
                "display" : "block",
                "z-index" : --currentZindex
              });

            showWidget("#loadingWidget", false);
            $("#title" + currentContainer).fadeOut();
            $("#divimage" + currentContainer).fadeOut(function() 
              {
                updateUrl();
                setTimeout(function() 
                  {
                    animating = false;
                    
                    if (bluetteTitleVisible)
                      {
                        $("#title" + activeContainer).text(getCurrentTitle()).fadeIn();
                      }

                    if (playing)
                      {
                        scheduleNextSlide(bluetteSlideshowSpeed);
                      }
                  }, 500);
              });
          }
      };

    /*******************************************************************************************************************************
     *
     * Computes the title for the current photo.
     *
     ******************************************************************************************************************************/
    var getCurrentTitle = function()
      {
        var photo = photos[currentPhotoIndex];
        var title = "" + (currentPhotoIndex + 1) + " / " + photos.length;

        if (photo.title !== null && photo.title !== "")
          {
            title = title + " - " + photo.title;
          }

        return title;
      };

    /*******************************************************************************************************************************
     *
     * Schedules the next slide to be rendered within the given delay.
     *
     ******************************************************************************************************************************/
    var scheduleNextSlide = function (delay)
      {
        info("scheduleNextSlide(%d)", delay);
        
        if (delay > 100)
          {
            $("#waitingWidget").fadeIn();
          }

        schedulerTimer = setTimeout(function() 
          { 
            showWidget("#waitingWidget", false);
            changePhoto(+1);
          }, delay);
      };

    /*******************************************************************************************************************************
     *
     *
     *
     ******************************************************************************************************************************/
    var showWidget = function (widget, status)
      {
        //$(widget).css({ "display" : status ? "block" : "none" });
        $(widget).css({"display" : status ? "inline" : "none"});
      };
      
    /*******************************************************************************************************************************
     *
     *
     ******************************************************************************************************************************/
    function info (pattern, arg1, arg2, arg3, arg4)
      {
        if (logging)
          {
            var d = new Date();
            console.log("%d:%d:%d.%d " + pattern, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds(), arg1, arg2, arg3, arg4);
          }
      }

    /*******************************************************************************************************************************
     *
     *
     ******************************************************************************************************************************/
    function debug (pattern, arg1, arg2, arg3, arg4)
      {
        if (logging)
          {
            var d = new Date();
            console.log("%d:%d:%d.%d >>>> " + pattern, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds(), arg1, arg2, arg3, arg4);
          }
      }

    /*******************************************************************************************************************************
     *
     * Initialization.
     *
     ******************************************************************************************************************************/
    info("baseUrl: %s, initialStatus: %s", baseUrl, initialStatus);
    setupNavigationWidgets();
    fitPhotoView();
    $(window).resize(fitPhotoView); 
    setTimeout(loadCatalog, 0);
  });

