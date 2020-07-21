const request = require("request");
const cheerio = require("cheerio");
const baseURL = "https://youtube.com/";

function num(s) {
  return parseInt(`${s}`.replace(/[^0-9.]/g, ""));
}

function findTextBetween(target, start, end, rareOffset = 0) {
  var chopFront = target.substring(
    target.search(start) + start.length + rareOffset,
    target.length
  ); //Honestly I have no idea why rareoffset + 6 works on fetching the json data, but it does 🤷‍♂️
  var result = chopFront.substring(0, chopFront.search(end));
  return result;
}

function scrapeYoutube(s = "live music stream", onlyLive = true) {
  const options = {
    method: "GET",
    url: `${baseURL}/results?search_query=${escape(s.replace(" ", "+"))}`,
    async: false,
  };
  return new Promise(function (resolve, reject) {
    request(options, function (error, response) {
      if (error) throw new Error(error);
      const $ = cheerio.load(response.body);
      const scripts = $("script").get();
      const text = scripts[scripts.length - 3].children[0].data;
      var findAndClean = findTextBetween(
        text,
        'window["ytInitialData"] = ',
        ";",
        6
      );
      var result = JSON.parse(findAndClean);
      const videos =
        result.contents.twoColumnSearchResultsRenderer.primaryContents
          .sectionListRenderer.contents[0].itemSectionRenderer.contents;
      let videosOut = [];
      videos.forEach((video) => {
        try {
          if (
            onlyLive &&
            !video.videoRenderer.badges &&
            video.videoRenderer.badges[0].label != "LIVE NOW"
          )
            return;

          const channelName = video.videoRenderer.ownerText.runs[0].text;
          const channelId =
            video.videoRenderer.ownerText.runs[0].navigationEndpoint
              .browseEndpoint.browseId;
          const channelThumbnail =
            video.videoRenderer.channelThumbnailSupportedRenderers
              .channelThumbnailWithLinkRenderer.thumbnail.thumbnails[0].url;
          const channelUrl = baseURL + "/channel/" + channelId;

          const videoThumbnails = video.videoRenderer.thumbnail.thumbnails;
          const videoWatching = {
            short: video.videoRenderer.shortViewCountText.runs[0].text,
            long: video.videoRenderer.viewCountText.runs[0].text,
          };
          const videoAcceessibilityData = video.videoRenderer.title.accessibility.accessibilityData.label.split(
            " "
          );
          const videoViews =
            videoAcceessibilityData[videoAcceessibilityData.length - 2];
          const videoStartedStreaming = videoAcceessibilityData
            .slice(
              videoAcceessibilityData.length - 5,
              videoAcceessibilityData.length - 2
            )
            .join(" ");

          const channel = {
            channelName,
            channelId,
            channelUrl,
            channelThumbnail,
          };
          const tempVid = new YoutubeVideo(
            video.videoRenderer.videoId,
            channel,
            video.videoRenderer.title.runs[0].text,
            videoWatching,
            videoViews,
            videoStartedStreaming,
            videoThumbnails
          );
          videosOut.push(tempVid);
        } catch (err) {}
      });
      resolve(videosOut);
    });
  });
}

function YoutubeVideo(
  id,
  channel,
  title,
  watching,
  views,
  startedStreaming,
  thumbnails
) {
  this.channel = channel;
  this.title = title;
  this.id = id;
  this.watching = watching;
  this.views = views;
  this.startedStreaming = startedStreaming;
  this.views = views;
  this.thumbnails = thumbnails;
}
YoutubeVideo.prototype.getIframe = function (
  width = 560,
  height = 315,
  allowFullscreen = true
) {
  return `<iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/${
    this.id
  }" frameborder="0" ${allowFullscreen ? "allowFullscreen" : ""}></iframe>`;
};
YoutubeVideo.prototype.getThumbnail = function () {
  return this.thumbnails[this.thumbnails.length - 1];
};
module.exports = scrapeYoutube;
