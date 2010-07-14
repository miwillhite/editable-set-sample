%w( rubygems sinatra haml sass json ).each do |gem|
	require gem
end

VERSION = 0.6

# Styles
get '/stylesheets/styles.css' do
  headers 'Content-Type' => 'text/css; :charset=utf-8'
	response['Expires'] = (Time.now + 60*60*24*356*3).httpdate
  sass :styles
end

# GET requests
get "/" do
  @version_number = VERSION.to_s
  haml :index
end

# PUT requests
put '/robot/1/application/1' do
  sleep 1
  content_type :json
  # Conver the params to json, remove '_attributes' (like rails would)
  params[:robot].to_json.gsub('_attributes', '')
  
end