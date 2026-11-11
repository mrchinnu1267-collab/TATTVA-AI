import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { configure, higgsfield } from "@higgsfield/client/v2";

const credentials = process.env.HF_CREDENTIALS?.trim();

if (!credentials) {
  console.error("Error: HF_CREDENTIALS is not configured in .env.local.");
  console.error('Please add HF_CREDENTIALS=<key-id>:<key-secret> to your local .env.local file.');
  process.exit(1);
}

configure({
  credentials,
});

async function main() {
  const model = "bytedance/seedance-2.5/text-to-video";
  const input = {
    prompt: "A cinematic scene at sunset",
    duration: 5,
    resolution: "720p",
    aspect_ratio: "16:9",
  };

  console.log(`Submitting video generation to ${model}...`);
  console.log(`Prompt: "${input.prompt}" | Duration: ${input.duration}s | Resolution: ${input.resolution} | Aspect Ratio: ${input.aspect_ratio}`);

  try {
    const response = await higgsfield.subscribe(model, {
      input,
      withPolling: true,
    });

    console.log("Terminal Status:", response.status);

    if (response.status === "completed") {
      const videoUrl = response.video?.url;
      if (videoUrl) {
        console.log("\n✅ Video generation succeeded!");
        console.log("Video URL:", videoUrl);
      } else {
        console.error("Status is 'completed', but no video URL was found in response:", response);
        process.exit(1);
      }
    } else if (response.status === "failed") {
      console.error("\n❌ Video generation failed.");
      console.error("Response details:", response);
      process.exit(1);
    } else if (response.status === "nsfw") {
      console.error("\n⚠️ Video generation rejected by content moderation (NSFW).");
      console.error("Response details:", response);
      process.exit(1);
    } else {
      console.error(`\n❌ Video generation finished with status '${response.status}'.`);
      console.error("Response details:", response);
      process.exit(1);
    }
  } catch (error: any) {
    console.error("\n❌ Execution error:", error?.message || error);
    if (error?.responseData) {
      console.error("API response details:", error.responseData);
    }
    process.exit(1);
  }
}

main();

