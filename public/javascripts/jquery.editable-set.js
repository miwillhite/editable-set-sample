/*
 *  EditableSet v0.8
 *  A jQuery edit-in-place plugin for editing entire sets of data.
 *  
 *  Requires jQuery 1.4.2 or newer
 *  
 *  Tested in Firefox 3.6+, Safari 5+, Chrome 5+, and IE8+
 *  
 *  Based on jquery_jeditable by http://www.appelsiini.net/projects/jeditable by Mike Tuupola
 *
 *  Copyright (c) 2010 Matt Willhite
 *
 *  Licensed under the MIT license:
 *  http://www.opensource.org/licenses/mit-license.php
 *
 */

(function($) {
  
  $.fn.editableSet = function(options) {
      
    // =================
    // = Build Options =
    // =================
    
    var opts = $.extend( {}, $.fn.editableSet.defaults, options );
    
    
    // ===================
    // = Define the Save =
    // ===================

    var save = function(self) {
      self.editing = false;
      
      // onSave callback
      opts.onSave.call( self );        

      var form = $('form', self);
      var action = form.attr( 'action' );

      // This is needed for rails to identify the request as json
      if( opts.dataType === 'json' ) {
        action = action + '.json';
      }

      // Generate the params
      var params;
      if( opts.globalSave ) {
        params = $( 'form', '.editable' ).serialize();
      } else {
        params = form.serialize();
      }

      // PUT the form and update the child elements
      $.put( action, params, function(data, textStatus) {

        // Parse the data if necessary
        data = $.parseJSON( data ) ? $.parseJSON( data ) : data;

        // Revert to original text
        if( opts.globalSave ) {
          $.each( $('.editable'), function(i, value) {
            $(value).html( $.fn.editableSet.globals.reversions[i] ).removeClass( 'active' );
            value.editing = false;
          });
        } else {
          $(self).html( self.revert ).removeClass( 'active' );
        }

        var spans;
        if( opts.globalSave ) {
          $.each( $('.editable'), function(i, editable) {
            spans = $('span', editable);  
            opts.repopulate.call( self, spans, data, opts );
          });
        } else {
          spans = $('span', self);
          opts.repopulate.call( self, spans, data, opts );
        }

        // afterSave Callback          
        opts.afterSave.call( self, data, textStatus );

      }, 
      opts.dataType, 

      // onFail
      function(xhr, status, error) {
        self.editing = true;

        // Reactivate the fields
        $(':input', self).attr( 'disabled', false );

        // onFail callback
        opts.onFail.call( self, xhr, status );
      });

    };
    
    
    // =====================
    // = Define the Cancel =
    // =====================

    var cancel = function(self) {
      self.editing = false;

      // Revert to original text
      $(self).html( self.revert ).removeClass( 'active' );

      // Callback
      opts.onCancel.call( self );
    };
  
  
    // ===========
    // = Public = 
    // ===========
    
    return this.each( function() {
      var self = this; // Because 'this' changes with scope
      
      $(self).bind( opts.event, function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if( self.editing ) {
          return;
        }
        
        self.editing = true;
        self.revert = $(self).html();
        
        // Assign an action dynamically
        if( $(this).attr( 'rel' ) ) {
          opts.action = $(this).attr( 'rel' );        
        }
        
        if( opts.globalSave ) {
          $.each( $('.editable'), function(i, value) {
            $.fn.editableSet.globals.reversions.push( $(value).html() );
          });
        }
        
        // beforeLoad callback
        opts.beforeLoad.call( self );
              
        // Create the form wrapper
        $(self).wrapInner( $('<form />', {
          action : opts.action,
          method : 'POST'
        }) ).addClass( 'active' );
        
        if( opts.titleElement ) {
          // Move the newly encapsulated titleElement outside of the form
          $(opts.titleElement, self).insertBefore( $('form', self) );          
        }

        // Define the 'appendable' element for the submit and cancel buttons
        var appendable;
        if( opts.titleElement && $(opts.titleElement, self).length > 0 ) {
          appendable = $(opts.titleElement, self);
        } else {
          appendable = $('form', self);
        } 
        
        // Append the 'Save' button
        appendable.append( $('<input />', {
          type  : "submit",
          value : "Save",
          click : function() {
            save( self );
            $(':input', self).attr( 'disabled', true );
            return false;
          }
        }).addClass( 'form_submit' ) );
        
        // Append the 'Cancel' button
        appendable.append( $('<input />', {
          type  : "button",
          value : "Cancel",
          click : function() {
            cancel( self );
            $(':input', self).attr( 'disabled', true );
            return false;
          }
        }).addClass( 'form_cancel' ) );
                           
        // Find each span with a +name+, loop through and replace with input
        var spans = $('span[name]', self);
        $.each( spans, function(i, span) {
          // Initialize
          var attrs = {};
          
          // Pass each of the span attributes to the attrs object
          $.each( span.attributes, function(i) {
            attrs[span.attributes[i].name] = span.attributes[i].value;
          });
          
          // Grab the value from the span's html
          attrs.value = $(span).html();
          
          // Assign the default type to 'text'
          attrs.type = attrs.type || 'text';
          var type = attrs.type;
          
          // If the specified type exists...proceed
          if( $.editableSet.types[type] ) {
            $.editableSet.types[type].element( span, attrs );
          }
          
        });
      
        // After Load Callback
        opts.afterLoad.call( self );
      });
      
      // ================
      // = Key Commands =
      // ================
      
      // Unbind the event namespace so it doesn't compound
      $(window).unbind( '.editableSet' );
      
      // Save if pressing cmd/ctrl + s
      $(window).bind( 'keydown.editableSet', function(e) {
        if( e.keyCode == 83 && (e.ctrlKey || e.metaKey) ) {
          e.preventDefault();
          save( self );
        }
      });
                 
      // Cancel if pressing esc
      $(window).bind( 'keydown.editableSet', function(e) {
        if( e.keyCode == 27 ) {
          e.preventDefault();
          cancel( self );
        }
      });
    });  
  };
  
  
  // ====================================================
  // = Takes a new object and safely applies attributes =
  // ====================================================
  
  $.fn.editableSet.attributor = function(newObject, attributes) {
    $.each( attributes, function(name, value ) {
      newObject[0].setAttribute( name, value );
    });
    
    // For the select menu prompt
    var prompt = attributes.prompt;
    if( prompt ) {
      newObject.prepend( $('<option />', {
        value : '',
        text  : prompt
      }) );            
    }
    return newObject;
  };
  
  
  // ======================================================
  // = Maps various input data types into a simple object =
  // ======================================================
  
  $.fn.editableSet.extractTextAndValue = function(options, option) {
    var textAndValue = {};
    
    // First, see if it's an array
    if( options.constructor === Array ) {
      // Then, see if it's a two-level multidimensional array
      if( options[0].constructor === Array ) {
        textAndValue.value = options[option][1];
        textAndValue.text = options[option][0];
      } else { // Assume it's a single-dimensional array
        textAndValue.value = options[option];
        textAndValue.text = options[option];
      }
    } else { // Assume it's a hash
      textAndValue.value = option;
      textAndValue.text = options[option];
    }
    
    // Return the object { text: value }
    return textAndValue;
  };
  
  
  // ===============
  // = Input types =
  // ===============
  
  $.editableSet = {
    types: {
      
      text: {
        element : function(object, attrs) {
          var newObject = $.fn.editableSet.attributor( $('<input />'), attrs );
          $(object).replaceWith( newObject );
        }
      },
      
      hidden: {
        element : function(object, attrs) {
          var newObject = $.fn.editableSet.attributor( $('<input />'), attrs );
          $(object).replaceWith( newObject );
        }
      },
      
      textarea: {
        element : function(object, attrs) {   
          // Clean up the attributes
          delete attrs.type;
                 
          var newObject = $.fn.editableSet.attributor( $('<textarea />'), attrs );
          newObject.text( attrs.value );          
          $(object).replaceWith( newObject );
        }
      },
      
      checkbox: {
        element : function(object, attrs) {
          attrs.checked_value = attrs.checked_value || "true";
          attrs.unchecked_value = attrs.unchecked_value || "false";
          
          if( attrs.value === attrs.checked_value ) {
            attrs.checked = true;
          }
          
          // Reassign the value to the supplied checked value
          attrs.value = attrs.checked_value;
          
          var newObject = $.fn.editableSet.attributor( $('<input />'), attrs );
          
          $(object).replaceWith( newObject );
          
          // Now add our hidden input (rails style), so that we can send negative values as well
          $( '<input />', { type: 'hidden', value: attrs.unchecked_value, name: attrs.name } ).insertBefore( newObject );
        }
      },
      
      select: {
        element : function(object, attrs) {          
          var options = JSON.parse( attrs.options );          
          var selectedValue = attrs.value;
          
          // Clean up the attributes
          delete attrs.type;
          delete attrs.value;
          delete attrs.options;
          
          // Pull into its own object so that we can add +option+s
          var newObject = $.fn.editableSet.attributor( $('<select />'), attrs );
                    
          // Wrap in closure to manage scope
          (function() {
            var option;
            for( option in options ) {
              // Extract the values and texts appropriately
              var selectTextAndValue = $.fn.editableSet.extractTextAndValue( options, option );
            
              $('<option />', {
                value : selectTextAndValue.value,
                text  : selectTextAndValue.text
              }).appendTo( newObject );
            }            
          })();
          
          $(object).replaceWith( newObject );
          
          // Apply the +selected+ attribute
          $('option[text="'+selectedValue+'"]', newObject).attr( 'selected', true );
          $('option[value="'+selectedValue+'"]', newObject).attr( 'selected', true );
        }
      },
      
      radio: {
        element : function(object, attrs) {    
          var options = JSON.parse( attrs.options ).reverse();
          
          // Clean up the attributes
          delete attrs.options;
          
          var originalValue = attrs.value;
          var originalId = attrs.name.replace( /\[|\]/g, '_' );
          
          // Wrap in closure to manage scope
          (function() {
            var option;
            for( option in options ) {
            
              // Extract the values and texts appropriately
              var radioTextAndValue = $.fn.editableSet.extractTextAndValue( options, option );
                        
              // Add the value and id attributes
              attrs.value = radioTextAndValue.value;
              attrs.id = originalId + radioTextAndValue.value.split( '' ).join( '' ).replace( /\s/, '_' ).toLowerCase(); // Underscorize
              
              var newObject = $.fn.editableSet.attributor( $('<input />'), attrs );
                        
              if( newObject.val() === originalValue || radioTextAndValue.text === originalValue ) {
                newObject.attr( 'checked', true );
              }
            
              // Build the label, append the radio and insert after the previous
              $('<label />', {
                text: radioTextAndValue.text
              }).append( newObject )
              .insertAfter( $(object) );
            
            }
            
          })();
          
          // Remove the original span
          $(object).remove(); 
          
        }
      }
    },
    
    addInputType: function(name, input) {
      $.editableSet.types[name] = input;
    }
  };
  
  
  /* 
   *  ===============================
   *  = Default repopulation method =
   *  ===============================
   *  
   *  Description:
   *    Loops through each 'named' span in the editable set and populates its value from the data object.
   *  
   *  Overview:
   *    1) Determine the model name from the +name+ attribute of the span.
   *    2) If there are associations, build up the association chain.
   *    3) Get the attribute.
   *    4) Use the association chain to find the correct attribute/value pair within the data object.
   *    5) Populate the span text with the found value.
   *  
   *  Comments throughout the repopulate method will use examples based off of the following:
   *
   *  Given 'patient[former_employer_attributes][0][address_attributes][street1]'
   *  And +data+ looks like:
   *  {[
   *    { 
   *      former_employer:
   *        address: {
   *          street1: "123 Fake St."
   *        }
   *    }
   *  ]}
   * 
   *
   */
  
  var repopulate = function(editable, data, opts) {
    
    $.each( editable, function(index, span) {

      var fieldName = $(span).attr( 'name' ); // TODO: get rid of this, just pass in the correct spans from the .call
      var associatedModels = {};
      // Only perform repopulation for spans with the name attribute
      if( fieldName ) {
        // First, extract the model name
        // e.g. 'patient', by grabbing all characters before the first '['
        var model = opts.model || fieldName.substr( 0, fieldName.indexOf( '[' ) );
        
        // Then replace all brackets with underscores for ease later on and remove the model name from the fieldName
        // e.g. 'patient[former_employer_attributes][0][address_attributes][street1]' => 'former_employer_attributes_0_address_attributes_street1'
        var modellessFieldName = fieldName.replace( /\]\[|\[|\]/g, '_' ).replace( model, '' ).replace( /^_+|_+$/g, '' );              

        // Next, pull out the digits and the 'attributes' so that we can define our associated models and attribute
        // e.g. ['former_employer', 'address', 'street1']
        var associatedModelAndAttributeSplit = modellessFieldName.split( /\d+_/ ).join( '' ).split( /_attributes_/ );
      
        // If we have associations, map them, otherwise move on
        if( associatedModelAndAttributeSplit.length > 1 ) {
          // Now using the associatedModelAndAttributeSplit we can build our map of associated models and their indices (if they have them)
          // e.g. { 'former_employer': 0, 'address': false }
          var associationIndex;
          $.each( associatedModelAndAttributeSplit, function(i, associatedModel) {
            
            // We don't need to run this on the last element because it is the attribute, not an associated model
            if( i < associatedModelAndAttributeSplit.length-1 ) {
              // Build a matcher based off of the associated model's name
              var indexMatcher = new RegExp( associatedModel + '_attributes_(\\d+)' );
                            
              // First get the match
              // Run that regexp on the "model-less" field name
              // e.g. match results => ['former_employer_attributes_0', '0']
              associationIndex = modellessFieldName.match( indexMatcher );
              
              // Then extract just the digits
              // e.g. '0'
              if( associationIndex ) {
                associationIndex = associationIndex[1]; // [1] To grab the captured digits
              }
              // Push the associated model and its index (if it has one) to the associatedModels object
              // e.g. { 'former_employer': 0, 'address': false }
              associatedModels[associatedModel] = associationIndex || false;
            }
          });                
        }
      
        // Set +attribute+ to the last element in the array
        // e.g. 'street1'
        var attribute = associatedModelAndAttributeSplit.pop();
        
        // Make a copy of our data, mostly to preserve the data namespace and to avoid confusion later on
        var selectedData = data, 
            value;
        
        // If there are no associated models it's an attribute of our primary model, set the value
        if( $.isEmptyObject( associatedModels ) ) {
          value = selectedData[attribute];
        } else {

          // Loop through each of the associated models and assign the corresponding value
          // Wrap this in a closure so we can manage the scope
          (function() {
            var associatedModel;
            for( associatedModel in associatedModels ) {
                                
              selectedData = selectedData[associatedModel];
              // If our associated model has a non-false index, that means it is part of an array and we need to provide the index
              if( associatedModels[associatedModel] ) {
                selectedData = selectedData[associatedModels[associatedModel]];               
              }
            
              // Sometimes the dataset may be empty
              if( typeof selectedData !== "undefined" && typeof selectedData[attribute] !== "undefined" ) {
                value = selectedData[attribute];
              }
            }            
          })();
        }
        
        // Assign the determined value to the span
        if( typeof value !== undefined ) {
          $(span).text( value );
        }
        
      }                            
    });
  };
  
  
  // ===================
  // = Define defaults =
  // ===================
  
  $.fn.editableSet.defaults = {
    event             : 'dblclick',
    action            : '/',
    beforeLoad        : $.noop,
    afterLoad         : $.noop,
    onCancel          : $.noop,
    onSave            : $.noop,
    afterSave         : $.noop,
    onFail            : $.noop,
    titleElement      : false,
    globalSave        : false,
    dataType          : 'script',
    repopulate        : repopulate
  };
  
  
  // ======================
  // = Initialize globals =
  // ======================
  
  $.fn.editableSet.globals = {
    reversions  : []
  };
  
})(jQuery);

// Extend jQuery with functions for PUT and DELETE requests.
// From http://homework.nwsnet.de/news/9132_put-and-delete-with-jquery
function _ajax_request(url, data, callback, type, method, error) {
  if( jQuery.isFunction(data) ) {
    callback = data;
    data = {};
  }

  return jQuery.ajax({
    type: method,
    url: url,
    data: data,
    success: callback,
    dataType: type,
    error: error
  });
}

jQuery.extend({
  put: function(url, data, callback, type, error) {
    return _ajax_request( url, data, callback, type, 'PUT', error );
  },
  delete_: function(url, data, callback, type, error) {
    return _ajax_request( url, data, callback, type, 'DELETE', error );
  }
});