import React, { useEffect, useRef, useState } from "react";
import Collapsible from 'react-collapsible';
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import hand_landmarker_task from "./hand_landmarker.task";

import './App-light.css';


const WebcamDisplay = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const scribbleCanvasRef = useRef(null);
    const [handPresence, setHandPresence] = useState(null);
    const [recordedPoints, setRecordedPoints] = useState([]);
    
    const [imageUrl, setImageUrl] = useState(null); // State to hold the image URL

    const [generateBtnText, setGenerateBtnText] = useState("Generate");
    const [prompt, setPrompt] = useState("bus");
    const [add_prompt, setAddPrompt] = useState("beautiful");
    const [neg_prompt, setNegPrompt] = useState("awful");
    const [num_images, setNumImages] = useState(1);
    const [image_resolution, setImageResolution] = useState(512);
    const [num_steps, setNumSteps] = useState(20);
    const [guidance_scale, setGuidanceScale] = useState(10);
    const [seed, setSeed] = useState(42);

    useEffect(() => {
        let handLandmarker;
        let animationFrameId;

        const initializeHandDetection = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
                );
                handLandmarker = await HandLandmarker.createFromOptions(
                    vision, {
                        baseOptions: { modelAssetPath: hand_landmarker_task },
                        numHands: 2,
                        runningMode: "video"
                    }
                );
                detectHands();
            } catch (error) {
                console.error("Error initializing hand detection:", error);
            }
        };

        const drawLandmarks = (landmarksArray) => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';

            landmarksArray.forEach(landmarks => {
                landmarks.forEach(landmark => {
                    const x = landmark.x * canvas.width;
                    const y = landmark.y * canvas.height;

                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, 2 * Math.PI); // Draw a circle for each landmark
                    ctx.fill();
                });
            });
        };

        const recordPoint = (handdnessArray, landmarksArray) => {
            //console.log(handdnessArray);
            // Find the index of the right hand and record the landmark at index 8 (tip of the index finger)
            let rightHandIndex = -1;
            handdnessArray.forEach((handedness, hand_idx) => {
                if (handedness[0].categoryName == "Right") {
                    rightHandIndex = hand_idx;
                }
            });
            //console.log(rightHandIndex);
            if (rightHandIndex > -1) {
                const rightHandLandmark8 = landmarksArray[rightHandIndex][8];
                // append the recorded point to the recordedPoints array
                setRecordedPoints(recordedPoints => [...recordedPoints, rightHandLandmark8]);
            }   
        };

        const detectHands = () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
                const detections = handLandmarker.detectForVideo(videoRef.current, performance.now());
                setHandPresence(detections.handednesses.length > 0);

                // Assuming detections.landmarks is an array of landmark objects
                if (detections.landmarks) {
                    drawLandmarks(detections.landmarks);
                    recordPoint(detections.handednesses, detections.landmarks);
                }
            }
            requestAnimationFrame(detectHands);
        };

        const startWebcam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoRef.current.srcObject = stream;
                // make the video and canvas the same size as the video stream
                const w = stream.getVideoTracks()[0].getSettings().width;
                const h = stream.getVideoTracks()[0].getSettings().height;
                videoRef.current.width = w;
                videoRef.current.height = h;
                canvasRef.current.width = w;
                canvasRef.current.height = h;
                scribbleCanvasRef.current.width = w;
                scribbleCanvasRef.current.height = h;
                await initializeHandDetection();
            } catch (error) {
                console.error("Error accessing webcam:", error);
            }
        };

        startWebcam();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            if (handLandmarker) {
                handLandmarker.close();
            }
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, []);

    const drawScribble = (pointsArray) => {
        const canvas = scribbleCanvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 1;
        ctx.beginPath();

        let firstPoint = true;  // Flag to indicate if this is the first point in the array
        //console.log(pointsArray);
        pointsArray.forEach(landmark => {
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;

            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            };
        });
        
        ctx.stroke();
    };

    const saveScribble = () =>{
        var canvas = scribbleCanvasRef.current;
        var dataURL = canvas.toDataURL("image/png");
        //var newTab = window.open('about:blank','image from canvas');
        //newTab.document.write("<img src='" + dataURL + "' alt='from canvas'/>");
        setImageUrl(dataURL);
        console.log(dataURL)
    };

    useEffect(() => {
        // This effect will run whenever recordedPoints state changes
        if (recordedPoints.length > 0) {
            drawScribble(recordedPoints);
        }
    }, [recordedPoints]);

    const generateImage = () => {
        setGenerateBtnText('Generating...');
        var canvas = scribbleCanvasRef.current;
        const scrible = canvas.toDataURL("image/png");
        callImageGenAPI(scrible);
      };

    const callImageGenAPI = async(scrible) => {
        console.log("Image generation called")

        
        const requestData = {
        image: scrible,
        prompt:prompt,
        additional_prompt: add_prompt,
        negative_prompt: neg_prompt,
        num_images: num_images,
        image_resolution: image_resolution,
        preprocess_resolution: 512,
        num_steps: num_steps,
        guidance_scale: guidance_scale,
        seed: seed,
        preprocessor_name: "HED"
        }
        //TODO: Implement the API call to the image generation model

        // Make a POST request to the API endpoint
        fetch('https://ade3-104-154-232-153.ngrok-free.app/generate', {
            method: 'POST', headers: {
            'Content-Type': 'application/json'
            }, body: JSON.stringify(requestData)
        }).then(response => {
            // Check if the response is successful
            if (!response.ok) {
            throw new Error('Network response was not ok');
            }
            // Parse the JSON response
            return response.json();
        })
        .then(data => {
            // Handle the response data
            setImageUrl(data.image);
            console.log('Response from API:', data);
        })
        .catch(error => {
            // Handle errors
            console.error('There was a problem with the fetch operation:', error);
        });
        
    };

    return (
    <div className="App">
      <header className="App-header">   
        <h1>Doodle by hand to image</h1>
        
        <div style={{ position: "relative" }}>
            <video className='video'
            ref={videoRef}
            width="640"
            height="480"
            autoPlay
            playsInline
            muted // Mute the video to avoid feedback noise
            ></video>
            <canvas className='video'
                ref={canvasRef}
                width="640"
                height="480"
                style={{ position: "absolute", top: 0, left: 0 }}
            ></canvas>
            <canvas className='video'
                ref={scribbleCanvasRef}
                width="640"
                height="480"
                style={{ position: "absolute", top: 0, left: 0 }}
            ></canvas>
        </div>
        <div>
            <button className='button-6' onClick={() => {setRecordedPoints([]); drawScribble([])}}>Clear</button>
            <button className='button-6' onClick={() => saveScribble()}>Save</button>
            <button className='button-6' onClick={generateImage}>{generateBtnText}</button>
        </div>
        <div>
            <label htmlFor="prompt">Prompt:</label>
            <input className="textbox_prompt" type="text" id="prompt" name="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)}/><br/>
            <Collapsible trigger="click to change the hyperparameters" >
                <div>
                    <label htmlFor="seed">Seed:</label>
                    <input className="textbox" type="text" id="seed" name="seed" value={seed} onChange={(e) => setSeed(e.target.value)}></input>
                    <label htmlFor="num_steps">Number of steps:</label>
                    <input className="textbox" type="text" id="num_steps" name="num_steps" value={num_steps} onChange={(e) => setNumSteps(e.target.value)}></input>
                </div>
                <div>
                    <label htmlFor="image_resolution">Image Resolution:</label>
                    <input className="textbox" type="text" id="image_resolution" name="image_resolution" value={image_resolution} onChange={(e) => setImageResolution(e.target.value)}></input>
                    <label htmlFor="guidance_scale">Guidance Scale:</label>
                    <input className="textbox" type="text" id="guidance_scale" name="guidance_scale" value={guidance_scale} onChange={(e) => setGuidanceScale(e.target.value)}></input>
                </div>
                <div>              
                    <label htmlFor="add_prompt">Additional Prompt:</label>
                    <input className="textbox" type="text" id="add_prompt" name="add_prompt" value={add_prompt} onChange={(e) => setAddPrompt(e.target.value)}></input>
                    <label htmlFor="neg_prompt">Negativ Prompt:</label>
                    <input className="textbox" type="text" id="neg_prompt" name="neg_prompt" value={neg_prompt} onChange={(e) => setNegPrompt(e.target.value)}></input>  
                </div>     
               
                {/*TODO: Add more inputs here */}
            </Collapsible>
        </div>
        {/*<p className='small'>Recorded Points: {JSON.stringify(recordedPoints)}</p>*/}
        
        {imageUrl && <img className='video' src={imageUrl} alt="Scribble Image" style={{backgroundColor: 'white'}}/>} {/* Display the image if imageUrl is not null */}
      </header>
    </div>
    );
};

export default WebcamDisplay;