FROM node

# Add files to the image
RUN mkdir -p /opt/nodejs
ADD . /opt/nodejs
WORKDIR /opt/nodejs

# Install the dependencies modules
RUN npm install
# Expose the container port
EXPOSE 5000

ENTRYPOINT ["node", "-harmony", "/src/index.js"]