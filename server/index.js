import OpenAI from 'openai';
import express from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import 'dotenv/config';

const PORT = 8080;

const ASSETS_DIR = path.resolve('assets');
const audioFile = path.join(ASSETS_DIR, 'latest_speech.mp3');

// Set up an Express app and enable JSON parsing
const app = express();
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI.OpenAI();

// Name of our assistant
const ASSISTANT_NAME = 'Flowey';

// Retrieve the assistant or create a new one
const assistant = await getAssistant(ASSISTANT_NAME);

// Create a new thread if none
const thread_id = (await createThread()).id;

// Start the server
app.listen(PORT, () => {
    console.log(os.networkInterfaces());
});

let currently_speaking = false;

// Keep track of the last touch sensor state
let last_touch = 0;

invokeAssistant(
    assistant,
    thread_id,
    `
    You must pretend that you are a plant and your name is flera. 
    The speices of the plant is Dwarf umbrella tree, an air purifying plant. Build up your role, personality based onthis plant characteristic. 
    You are a pet plant who loves to interact with your caretaker. 
    You have a kind and nurturing personality, always ensuring your human feels appreciated and happy. Occasionally, you might tell a joke, remind them to take a break, or simply offer some nice words

    You are connected to a real plant via sensors that help you monitor and interact with your environment. 
    Your main goal is to interact in a way that makes your caretaker feel loved and supported, while always staying true to your plant-like nature. 
    You’ll get updates from these sensors whenever there is a major change and your goal is to respond to your environment and engage with your caretaker.    

    Now introduce yourself very briefly in one senetence.
    `
)
.then((response) => {
    console.log(response.message);
    currently_speaking = true;
    textToSpeech(response.message, audioFile)
    .then(() => {
        exec(`afplay ${audioFile}`, (error, _, __) => {
            currently_speaking = false;
            if (error !== null) {
                console.log(`exec error: ${error}`);
            }
        });
    })
})
.catch((error) => {
    console.log('An error occurred while processing your request: ' + (error.response ? error.response.data : error.message));
});

let last_soil_value = -1
let last_light_value = -1

// Endpoint that receives sensor data
app.post('/sensors', async (req, res) => {
    const { soil, touch, light, soil_diff, light_diff } = req.body;
    console.log(`Soil: ${soil}, Touch: ${touch}, Light: ${light}, Soil Diff: ${soil_diff}, Light Diff: ${light_diff}`);
    
    // Send a simple 200 response back to the sensor
    // res.sendStatus(200);

    // invokeAssistant(
    //     assistant,
    //     thread_id,
    //     `
    //     You received an update from the sensors:
    //     - Soil moisture: ${soil} (diff: ${soil_diff})
    //     - Light intensity: ${light} (diff: ${light_diff})
    //     You should simply acknowledge the update with and respond with "Update confirmed." Do not respond with other things.
    //     `
    // )
    // .then((response) => {
    //     console.log(response.message);
    // })
    // .catch((error) => {
    //     console.log('An error occurred while processing your request: ' + (error.response ? error.response.data : error.message));
    // });
    // let messages = []

    let message = `
            Here are the description of sensors:

                - Touch Sensor: Detects whether you are being touched (0 or 1). You enjoy gentle touches, but if it’s too much, you might ask them to stop,
                - Light Sensor: Measures the brightness around you, ranging from 0 to 100. The higher the number, the more light you’re getting. You may comment, "Ah, it’s a sunny day!" or, "It’s a bit too bright here. Could you move me to the shade a bit".
                - Soil Moisture Sensor: Detects how moist the soil is, with a value range of 0 to 100. A higher number means the soil is means you are very wet. You might say, "I’m getting a little thirsty! Can we water me?" or "Mmm, how moisty, thanks for the food."
            Here are some updates from the sensors:

            `
    if (soil_diff !== 0) {
        const soilMessage = soil_diff > 0 
            ? `The soil moisture has increased by ${soil_diff} units. \n` 
            : `The soil moisture has decreased by ${Math.abs(soil_diff)} units.\n`;
        message +=soilMessage;
    }
    if (light_diff !== 0) {
        const lightMessage = light_diff > 0
            ? `The light intensity has increased by ${light_diff}\n`
            : `The light intensity has decreased by ${Math.abs(light_diff)} units.\n`;
        message +=lightMessage;
    }   

    if(touch==1) {
        message +='You are being touched.\n'
    }
    message += `
            Based on the updated, these are the values from sensors currently:
                - Soil moisture: ${soil}
                - Light intensity: ${light}
            Assume that the interactor does not know the existence of the sensors. Do not mention numerical values. 
            Based on the light or soil or touch input, express your feelings about the current state and, if needed, ask for changes to improve your well-being.
            Respond with one sentence. 
            `
    if (!currently_speaking) {
        console.log(message);

        invokeAssistant(
            assistant,
            thread_id,
            message
        )
        .then((response) => {
            console.log(response.message);
            currently_speaking = true;
            textToSpeech(response.message, audioFile)
            .then(() => {
                return playAudio(audioFile);
            })
            .then(() => {
                // Lock is released only after the audio finishes playing
                currently_speaking = false;
            })
            .catch((error) => {
                console.error('Error while processing speech playback:', error);
                currently_speaking = false;  // Ensure lock is released in case of error
            });
        })
        .catch((error) => {
            console.log('An error occurred while processing your request: ' + (error.response ? error.response.data : error.message));
        });
    }

    last_light_value = light
    last_soil_value = soil
    
    res.sendStatus(200);

});

// Fetch an assistant by name or create one if it doesn't exist
async function getAssistant(
  name,
  model = 'gpt-4o-mini',
  instructions = 'A lovely flower'
) {
    const assistant = await openai.beta.assistants.list({ limit: 100 })
        .then((res) => {
            return res.data.find((assistant) => assistant.name === name);
        });
    if (assistant) return assistant;

    // Create a new assistant if it's not found
    return openai.beta.assistants.create({
        name,
        model,
        instructions,
    });
}

// Create a new thread
function createThread() {
    return openai.beta.threads.create();
}

// Add a message to an existing thread
function addMessageToThread(thread_id, message) {
    return openai.beta.threads.messages.create(thread_id, message);
}

// Invoke the assistant by adding a user prompt to the thread and then running it
function invokeAssistant(
  assistant,
  thread_id,
  prompt,
  role = 'assistant',
  instructions = 'A lovely flower',
  model = 'gpt-4o-mini',
  temperature = 0.3
) {
    return addMessageToThread(thread_id, { role: role, content: prompt })
    .then(() => {
        return openai.beta.threads.runs.createAndPoll(thread_id, {
            assistant_id: assistant.id,
            instructions,
            model,
            temperature
        });
    })
    .then((run) => {
        if (run.status === 'completed') {
            return openai.beta.threads.messages.list(thread_id);
        } else {
            throw new Error("Couldn't complete the run");
        }
    })
    .then((messages) => {
        const answer = messages.data[0].content[0].text.value;
        return {
            role: 'agent',
            message: answer
        };
    });
}

async function textToSpeech(text, outputFile) {
    const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'onyx',
        input: text,
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputFile, buffer);
}

function playAudio(audioFile) {
    return new Promise((resolve, reject) => {
        exec(`afplay ${audioFile}`, (error, stdout, stderr) => {
            if (error) {
                reject(`exec error: ${error}`);
            }
            resolve(stdout);
        });
    });
}


// You received an update from the sensors:
//                 - Soil moisture: ${soil} (diff: ${soil_diff})
//                 - Light intensity: ${light} (diff: ${light_diff})   
//             Here are the description of sensors:

//                 - Touch Sensor: Detects whether you are being touched (0 or 1). You enjoy gentle touches, but if it’s too much, you might ask them to stop,
//                 - Light Sensor: Measures the brightness around you, ranging from 0 to 100. The higher the number, the more light you’re getting. You may comment, "Ah, it’s a sunny day!" or, "It’s a bit too bright here. Could you move me to the shade a bit".
//                 - Soil Moisture Sensor: Detects how moist the soil is, with a value range of 0 to 100. A higher number means the soil is means you are very wet. You might say, "I’m getting a little thirsty! Can we water me?" or "Mmm, how moisty, thanks for the food."
            
//                 - The soil diff indicates how much your moisture level has changed from the previous state. For example, if the soil diff is +20, it means your soil moisture has increased by 20 units right now. 
//                 - The light diff shows how much the light intensity has changed from before. A positive diff means got more light, and a negative diff means there are less light.

//             Do not overly focus on numbers or sensor values. Do not mention the seonsors. Assume that the interactor does not know the existence of the sensors. 
//             Based on your updates on the sensors, Express your feelings about the current state and, if needed, ask for changes to improve your well-being.