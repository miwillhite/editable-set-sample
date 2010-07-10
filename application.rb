%w( rubygems sinatra haml sass json ).each do |gem|
	require gem
end

# Styles
get '/stylesheets/styles.css' do
  headers 'Content-Type' => 'text/css; :charset=utf-8'
	response['Expires'] = (Time.now + 60*60*24*356*3).httpdate
  sass :styles
end

# GET requests
get "/" do
  haml :index
end

# PUT requests
put '/robot/1/application/1' do
  content_type :json
  # Conver the params to json, remove '_attributes' (like rails would)
  params[:robot].to_json.gsub('_attributes', '')
  
end

enable :inline_templates

__END__



@@ layout

!!!
%html{ :xmlns => "http://www.w3.org/1999/xhtml" }
  %head
    %title
      EditableSet v0.8
      
    %link{ :type => 'text/css', :href => '/stylesheets/styles.css', :rel => 'stylesheet' }

  %body
    %h1 EditableSet v0.8
    = yield
    
    %script{ :type => 'text/javascript', :src => 'http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js' }
    %script{ :type => "text/javascript", :src => "/javascripts/jquery.editable-set.js", :charset => "utf-8" }
    
    :javascript
      $('.editable').editableSet({
        action: '/robot/1/application/1'
      });
    
    
    
@@index

.editable

  %h3 Editing Robot License Application
  
  %ul  
    %li
      %label Desired Robot Name:
      %span{ :name => 'robot[application_attributes][name]' } Wallbot
  
    %li
      %label 
        Are you Robo Certified and Approved?
        %br
        %span{ :name => 'robot[application_attributes][certified]', :type => :checkbox, :checked_value => 'Yes', :unchecked_value => 'No' } Yes

    %li
      %label Describe your assets and primary functions:
      %span{ :name => 'robot[application_attributes][description]', :type => :textarea } I have the ability to scale vertical walls at a very fast pace.

    %li  
      %label What is your Operational Status?
      %span{ :name => 'robot[application_attributes][status]', :type => :select, :options => '["Need Repair", "Functional", "Prime Condition"]' } Functional
    
    %li
      %label What are your intentions towards mankind?
      %span{ :name => 'robot[application_attributes][intentions]', :type => :select, :options => '["Evil", "Neutral", "Good"]' } Good



@@styles

body
  :font-family "Lucida Grande", "Lucida Sans", Lucida, Arial, sans-serif
  :color #333
  :padding 40px

label
  :display block
  :font-weight bold
  span
    :font-weight normal

h1
  :text-shadow 1px 1px 2px #555
 
h3
  :background #F2F5BA
  :padding 8px

ul
  :padding 0
  :margin-bottom 30px
  li
    :margin-bottom 12px
    :list-style none

input[type='text'], textarea
  :width 25%