import OpenAI from 'openai';
import express from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import path from 'path';
import { exec } from 'child_process';
import 'dotenv/config';

const PORT = 8080;

const ASSETS_DIR = path.resolve('assets');
const audioFile = path.join(ASSETS_DIR, 'latest_speech.mp3');

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

// Endpoint that receives sensor data
app.post('/sensors', async (req, res) => {
    const { soil, touch, light } = req.body;
    console.log(`Soil: ${soil}, Touch: ${touch}, Light: ${light}`);
    
    // Send a simple 200 response back to the sensor
    res.sendStatus(200);
    
    // Only invoke the assistant when the touch sensor changes from 0 to 1
    if (touch == 1 && last_touch == 0) {
        invokeAssistant(
            assistant,
            thread_id,
            'Touch sensor is triggered.',
            'You must pretend that you are a lovely flower. You are connected to sensors attached to a real plant. You will get updates each time some sensor is triggered.'
        )
        .then((response) => {
            console.log(response.message);
            textToSpeech(response.message, audioFile)
            .then(() => {
                exec(`cvlc --play-and-exit ${audioFile}`, (error, _, __) => {
                    if (error !== null) {
                        console.log(`exec error: ${error}`);
                    }
                });
            })
        })
        .catch((error) => {
            console.log('An error occurred while processing your request: ' + (error.response ? error.response.data : error.message));
        });
        if (!currently_speaking) {
            invokeAssistant(
                assistant,
                thread_id,
                'Touch sensor is triggered.',
                'You must pretend that you are a lovely flower. You are connected to sensors attached to a real plant. You will get updates each time some sensor is triggered.'
            )
            .then((response) => {
                console.log(response.message);
                currently_speaking = true;
                textToSpeech(response.message, audioFile)
                .then(() => {
                    exec(`cvlc --play-and-exit ${audioFile}`, (error, _, __) => {
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
        }
    }
    last_touch = touch;
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
  instructions = 'A lovely flower',
  model = 'gpt-4o-mini',
  temperature = 0.3
) {
    return addMessageToThread(thread_id, { role: 'user', content: prompt })
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
async function textToSpeech(text, outputFile) {
    const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'onyx',
        input: text,
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputFile, buffer);
}