/**
 *  Copyright (c) 2010 Alethia Inc,
 *  http://www.alethia-inc.com
 *  Developed by Travis Tidwell | travist at alethia-inc.com 
 *
 *  License:  GPL version 3.
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *  
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.

 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */
(function($) {
   jQuery.media = jQuery.media ? jQuery.media : {};     
   
   // Set up our defaults for this component.
   jQuery.media.defaults = jQuery.extend( jQuery.media.defaults, {
      node:""                  
   }); 

   jQuery.media.ids = jQuery.extend( jQuery.media.ids, {
      voter:".mediavoter",
      uservoter:".mediauservoter",
      mediaRegion:".mediaregion",
      field:".mediafield"                 
   });   
   
   jQuery.fn.medianode = function( server, settings ) {
      if( this.length === 0 ) { return null; }
      return new (function( server, node, settings ) {
         settings = jQuery.media.utils.getSettings(settings);
         
         // Save the jQuery display.
         this.display = node;
         this.nodeInfo = {};
         var _this = this;
         
         // Add the min player as the player for this node.
         this.player = this.display.find(settings.ids.mediaRegion).minplayer( settings );  
         
         // Store all loaded images.
         this.images = [];
         
         // Indicator to let us know we are waiting on something...
         this.waiting = false;
         
         // Get the width and height.
         this.width = this.display.width();
         this.height = this.display.height();
         
         // Load the voters...
         this.voter = this.display.find(settings.ids.voter).mediavoter( settings, server, false );
         this.uservoter = this.display.find(settings.ids.uservoter).mediavoter( settings, server, true );
         if( this.uservoter && this.voter ) {
            this.uservoter.display.bind( "processing", function() {
               _this.waiting = true;
               _this.player.busy.show();
            });
            this.uservoter.display.bind( "voteGet", function() {
               if( _this.waiting ) {
                  _this.waiting = false;
                  _this.player.busy.hide();
               }
            });            
            this.uservoter.display.bind( "voteSet", function( event, vote ) {
               if( _this.waiting ) {
                  _this.waiting = false;
                  _this.player.busy.hide();
               }
               _this.voter.updateVote( vote );   
            });
         }
         
         this.loadNode = function( _nodeInfo ) {
            this.getNode( this.translateNode( _nodeInfo ) );
         };

         this.translateNode = function( _nodeInfo ) {
            var isValue = ((typeof _nodeInfo) == "number") || ((typeof _nodeInfo) == "string");
            if( !_nodeInfo ) {
               var defaultNode = settings.node;
               if( (typeof defaultNode) == 'object' ) {
                  defaultNode.load = false;
                  return defaultNode;   
               }
               else {
                  return defaultNode ? {nid:defaultNode, load:true} : null;
               }
            }
            else if( isValue ) {
               return {nid:_nodeInfo, load:true};
            }
            else {
               _nodeInfo.load = false;
               return _nodeInfo;
            }
         };

         this.onResize = function( deltaX, deltaY ) { 
            // Resize the player.     
            if( this.player ) {
               this.player.onResize( deltaX, deltaY );
            }
            
            // Refresh all images.
            var i=this.images.length;
            while(i--) {
              this.images[i].refresh(); 
            }
         };
         
         this.getNode = function( _nodeInfo ) {
            if( _nodeInfo ) {
               if( server && _nodeInfo.load ) {
                  server.call( jQuery.media.commands.loadNode, function( result ) {
                     _this.setNode( result );
                  }, null, _nodeInfo.nid, {} );
               }
               else {
                  this.setNode( _nodeInfo ); 
               }
            }
         };

         this.setNode = function( _nodeInfo ) {
            if( _nodeInfo ) {
               // Set the node information object.
               this.nodeInfo = _nodeInfo;
   
               // Load the media...
               if( this.player && this.nodeInfo.mediafiles ) {
                  // Load the media...
                  this.player.loadFiles( this.nodeInfo.mediafiles.media );
                  
                  // Load the preview image.
                  var image = this.getImage("preview");
                  if( image ) {
                     this.player.loadImage( image.path );
                  }
                  else {
                     this.player.clearImage();   
                  }
               }
               
               // Get the vote for these voters.
               if( this.voter ) {
                  this.voter.getVote( _nodeInfo );
               }
               if( this.uservoter ) {
                  this.uservoter.getVote( _nodeInfo );
               }
               
               // Load all of our fields.
               this.display.find(settings.ids.field).each( function() {
                  _this.setField( this, _nodeInfo, $(this).attr("type"), $(this).attr("field") );
               });
                  
               // Trigger our node loaded event.
               this.display.trigger( "nodeload", this.nodeInfo );
            }
         }; 

         this.setField = function( fieldObj, _nodeInfo, type, fieldName ) {
            // We only want to load the fields that have a type.
            if( type ) {
               switch( type ) {
                  case "text":
                     this.setTextField( fieldObj, _nodeInfo, fieldName );
                     return true;
   
                  case "image":
                     return this.setImageField( fieldObj, fieldName );
   
                  default:
                     if( settings.template.setField ) {
                        // Let the template set this field.
                        return settings.template.setField({
                           node:_nodeInfo,
                           field:fieldObj,
                           fieldType:type, 
                           fieldName:fieldName
                        });
                     }
                     else {
                        return true;  
                     }
               }
            }
         };
         
         this.setTextField = function( fieldObj, _nodeInfo, fieldName ) {
            var field = _nodeInfo[fieldName];
            if( field ) {
               $(fieldObj).empty().html( field );  
            }        
         };

         this.getImage = function( imageName ) {
            var images = this.nodeInfo.mediafiles ? this.nodeInfo.mediafiles.images : null;
            var image = null;
            if( images ) {
               
               // Get the image.
               if( images[imageName] ) {
                  image = images[imageName];
               }
               else {
                  // Or just use the first image...
                  for( var key in images ) {
                     if( images.hasOwnProperty( key ) ) {
                        image = images[key];
                        break;  
                     }
                  }
               }
               
               // If they just provided a string, then still show the image.
               image = (typeof image === "string") ? {path:image} : image;
               image.path = image.path ? jQuery.trim(image.path) : ( settings.baseURL + jQuery.trim(image.filepath) );
               if( image && image.path ) {
                  image.path = image.path ? jQuery.trim(image.path) : ( settings.baseURL + jQuery.trim(image.filepath) );
               }
               else {
                  image = null;   
               }
            }
            return image;
         };
         
         this.setImageField = function( fieldObj, fieldName ) {
            var loaded = true;
            var file = this.getImage( fieldName );
            if( file ) {
               var image = $(fieldObj).empty().mediaimage();
               this.images.push( image );
               image.loadImage( file.path );
               loaded = false;
            }
            return loaded;
         };
      })( server, this, settings );
   };
})(jQuery);