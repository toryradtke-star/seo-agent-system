import { expandTopics, splitTopicAndLocation } from "./topicExpansion.js";

export function buildSiteArchitecture(input = {}) {
  const siteName = input.siteName || input.brand || "WP Page Builder Site";
  const { baseTopic, location } = splitTopicAndLocation(input.topic || "", input.location);
  const expandedTopics = expandTopics(input.topic || "", { location });

  const pages = [
    {
      type: "home",
      topic: input.brand || baseTopic || input.topic,
      location,
      theme: input.theme
    },
    ...expandedTopics.map((entry) => ({
      type: "service",
      topic: entry.fullTopic,
      location,
      theme: input.theme
    })),
    ...(location
      ? expandedTopics.map((entry) => ({
          type: "location",
          topic: entry.topic,
          location,
          theme: input.theme
        }))
      : []),
    ...expandedTopics.slice(0, 2).map((entry) => ({
      type: "blog",
      topic: `What to Know About ${entry.topic}${location ? ` in ${location}` : ""}`,
      location,
      theme: input.theme
    }))
  ];

  return {
    siteName,
    pages
  };
}
