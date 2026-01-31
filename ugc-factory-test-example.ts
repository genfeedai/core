#!/usr/bin/env bun

/**
 * UGC Factory Test Example
 * 
 * This script demonstrates how to use the new UGC Factory API
 * to generate multiple video variations and distribute them across platforms.
 */

const GENFEED_API_BASE = 'http://localhost:3000/api'; // Update with your API URL

async function testUGCFactory() {
  console.log('🚀 UGC Factory Test Starting...\n');

  // Step 1: Check health and configuration
  console.log('1. Checking UGC Factory health...');
  const healthResponse = await fetch(`${GENFEED_API_BASE}/ugc-factory/health`);
  const health = await healthResponse.json();
  console.log('Health:', health.status);
  console.log('Configured platforms:', health.features.delivery_platforms.configured);
  console.log('Connected platforms:', health.features.delivery_platforms.connected);
  console.log('');

  // Step 1.5: Test delivery connections
  console.log('1.5. Testing delivery platform connections...');
  const deliveryTestResponse = await fetch(`${GENFEED_API_BASE}/ugc-factory/delivery/test`);
  const deliveryTest = await deliveryTestResponse.json();
  console.log('Connection status:', deliveryTest.overall_status);
  
  deliveryTest.connection_tests.forEach(test => {
    const status = test.enabled 
      ? (test.connected ? '✅ Connected' : '❌ Failed') 
      : '⚪ Disabled';
    console.log(`  ${test.platform}: ${status}`);
    if (test.error) {
      console.log(`    Error: ${test.error}`);
    }
  });
  console.log('');

  // Step 2: Create a UGC batch
  console.log('2. Creating UGC batch...');
  
  const ugcRequest = {
    script: "This app changed my life! I lost 10 pounds in just 2 weeks using this simple hack. You won't believe how easy it is!",
    avatar_image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400", // Sample avatar
    voice_config: {
      voice_id: "rachel", // Popular ElevenLabs voice
      stability: 0.6,
      similarity_boost: 0.8
    },
    motion_preset: "enthusiastic", // More animated for UGC style
    output_formats: ["9:16", "1:1", "16:9"], // TikTok, Instagram, YouTube order
    variations: 3, // A/B test versions
    debug_mode: true, // Set to false for real generation
    delivery: {
      telegram: {
        enabled: true,
        targets: ["@your_test_channel"], // Update with your actual channel
        caption: "🎬 Generated with UGC Factory! Check out this amazing transformation!"
      },
      discord: {
        enabled: true, // Will work with either webhook URL or channel ID
        channels: ["your_webhook_url_or_channel_id"], // Update with your webhook/channel
        caption: "**New UGC Video Generated** 🚀\n\nThis app changed my life!"
      },
      google_drive: {
        enabled: true,
        folder_name: "UGC_Factory_Test" // Custom folder name
      }
    }
  };

  const createResponse = await fetch(`${GENFEED_API_BASE}/ugc-factory/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ugcRequest)
  });

  const batchResult = await createResponse.json();
  console.log('Batch created:', batchResult);
  console.log('');

  const batchId = batchResult.batch_id;

  // Step 3: Monitor batch progress
  console.log('3. Monitoring batch progress...');
  
  let completed = false;
  let attempts = 0;
  const maxAttempts = 20; // ~10 minutes max wait

  while (!completed && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s
    attempts++;

    const statusResponse = await fetch(`${GENFEED_API_BASE}/ugc-factory/batch/${batchId}`);
    const status = await statusResponse.json();

    console.log(`Status check ${attempts}: ${status.status} - ${status.completed_jobs}/${status.total_jobs} complete`);

    if (status.status === 'completed') {
      completed = true;
      console.log('');
      console.log('🎉 Batch completed!');
      console.log('Results:');
      
      status.results.forEach((result: any, index: number) => {
        console.log(`  Video ${index + 1}: ${result.format} (variation ${result.variation})`);
        console.log(`    URL: ${result.video_url}`);
        console.log(`    Generation time: ${result.generation_time_ms}ms`);
        console.log(`    Cost: $${result.cost.toFixed(3)}`);
        
        if (result.delivery_results) {
          console.log(`    Delivery results:`);
          Object.entries(result.delivery_results).forEach(([platform, result]: [string, any]) => {
            const status = result.success ? '✅' : '❌';
            console.log(`      ${platform}: ${status} ${result.success ? 
              (result.delivered_count ? `(${result.delivered_count} targets)` : '') : 
              `(${result.error})`}`);
          });
        }
        console.log('');
      });

      console.log(`Total cost: $${status.total_cost.toFixed(2)}`);
      break;
      
    } else if (status.status === 'failed') {
      console.log('❌ Batch failed');
      console.log('Failed jobs:', status.failed_jobs);
      break;
    }
  }

  if (attempts >= maxAttempts) {
    console.log('⏰ Timeout waiting for batch completion');
  }

  // Step 4: Get final results
  console.log('');
  console.log('4. Final results summary:');
  const finalStatusResponse = await fetch(`${GENFEED_API_BASE}/ugc-factory/batch/${batchId}`);
  const finalStatus = await finalStatusResponse.json();
  
  console.log(`Batch: ${finalStatus.batch_id}`);
  console.log(`Status: ${finalStatus.status}`);
  console.log(`Videos generated: ${finalStatus.completed_jobs}/${finalStatus.total_jobs}`);
  console.log(`Total cost: $${finalStatus.total_cost.toFixed(2)}`);
  console.log('');

  // Step 5: Cost estimation example
  console.log('5. Testing cost estimation...');
  const estimateResponse = await fetch(`${GENFEED_API_BASE}/ugc-factory/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ugcRequest)
  });

  const estimate = await estimateResponse.json();
  console.log('Cost estimate:', estimate);
}

// Run the test
testUGCFactory().catch(console.error);

/**
 * Expected Output (Debug Mode):
 * 
 * 🚀 UGC Factory Test Starting...
 * 
 * 1. Checking UGC Factory health...
 * Health: { status: 'healthy', version: '1.0.0', features: { ... } }
 * Configured platforms: 2
 * 
 * 2. Creating UGC batch...
 * Batch created: {
 *   batch_id: 'ugc_1706634123456_abc123',
 *   jobs_queued: 9,
 *   estimated_completion: '12 minutes',
 *   total_estimated_cost: 4.50,
 *   status: 'queued'
 * }
 * 
 * 3. Monitoring batch progress...
 * Status check 1: processing - 3/9 complete
 * Status check 2: processing - 7/9 complete  
 * Status check 3: completed - 9/9 complete
 * 
 * 🎉 Batch completed!
 * Results:
 *   Video 1: 9:16 (variation 0)
 *     URL: https://genfeed.ai/output/...
 *     Generation time: 245000ms
 *     Cost: $0.500
 *     Delivered to: telegram, google_drive
 * 
 *   [... 8 more videos ...]
 * 
 * Total cost: $4.50
 */