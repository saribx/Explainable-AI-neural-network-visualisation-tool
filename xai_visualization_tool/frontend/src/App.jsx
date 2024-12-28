import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { useState } from 'react';
import './App.css';
import api from './api';
import NNdrawer from "./NNdrawer.jsx";

function App() {
    // Track upload status of model and activation files
    const [isModelFileUploaded, setIsModelFileUploaded] = useState(false);
    const [isActFileUploaded, setIsActFileUploaded] = useState(false);
    const [file, setFile] = useState(null);
    const [Afile, setAFile] = useState(null);
    const [visualizationData, setVisualizationData] = useState(null);

    // Handle model file upload and send to backend
    async function handleModelFileInput(e) {
        const files = e.target.files;
        if (files) {
            setFile(files[0]);
            setIsModelFileUploaded(true);
            const formData = new FormData();
            formData.append('file', files[0]);
            await api.post('/upload_model/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        }
    }

    // Handle activation file upload and send to backend
    async function handleActFileInput(e) {
        const Afiles = e.target.files;
        if (Afiles) {
            setAFile(Afiles[0]);
            setIsActFileUploaded(true);
            const formData = new FormData();
            formData.append('file', Afiles[0]);
            await api.post('/upload_activations/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        }
    }

    // Create and trigger hidden file input for model upload
    function handleModelUploadButtonClick() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pt, .pth';  // Accept only PyTorch model files
        input.onchange = handleModelFileInput;
        input.click();
    }

    // Create and trigger hidden file input for activation file upload
    function handleActUploadButtonClick() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pt, .pth';  // Accept only PyTorch tensor files
        input.onchange = handleActFileInput;
        input.click();
    }

    // Fetch visualization data when both files are uploaded
    async function handleVisualizeButtonClick() {
        try {
            const response = await api.get('/');
            setVisualizationData(response.data);
        } catch (error) {
            console.error("Error fetching visualization data:", error);
        }
    }

    return (
        <Router>
            {/* Navigation Menu */}
            <nav className="navbar">
                <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/create_NN">Create NN</Link></li>
                </ul>
            </nav>
            <Routes>
                {/* Home Page Route */}
                <Route path="/" element={
                    <>
                        <h1 className="H">XAI NN Visualization Tool</h1>
                        <h3>Upload your trained model and its activations to visualize your neural network</h3>

                        {/* Example code block for generating activations */}
                        <div className="code-block">
                            <p>With the simple upload of your trained model and its activations saved as .pt file</p>
                            <p>You can see the activations visually with histograms</p>
                            <p>To generate the activations you can use the following code:</p>
                            <code>
                                <span className="keyword">acts</span> = <span className="function">collect_activation</span>(model_linear_correlated_data,
                                model_linear_correlated_data_dict[&quot;x_train&quot;])<br/>
                                <span className="function">torch.save</span>(acts, &apos;activations.pt&apos;)
                            </code>
                        </div>

                        {/* Model upload section */}
                        <button onClick={handleModelUploadButtonClick} className="upload-button">
                            Upload Model
                        </button>
                        {isModelFileUploaded && file &&
                            <p className="upload-text">Model File Uploaded: {file.name}</p>
                        }

                        {/* Activation file upload section */}
                        <button onClick={handleActUploadButtonClick} className="upload-button">
                            Upload Activations
                        </button>
                        {isActFileUploaded && Afile &&
                            <p className="upload-text">Activation File Uploaded: {Afile.name}</p>
                        }

                        {/* Visualize button - active only when both files are uploaded */}
                        {isActFileUploaded && isModelFileUploaded ? (
                            <button className="upload-button activated" onClick={handleVisualizeButtonClick}>
                                Visualize
                            </button>
                        ) : (
                            <button className="upload-button non-activated">
                                Visualize
                            </button>
                        )}

                        {/* Display visualization results */}
                        {visualizationData && (
                            <div className="code-block">
                                <pre>{JSON.stringify(visualizationData, null, 2)}</pre>
                            </div>
                        )}
                    </>
                } />
                {/* Neural Network Creation Page Route */}
                <Route path="/create_NN" element={<CreateNN />} />
            </Routes>
        </Router>
    );
}

// Component for creating and visualizing neural network architectures
function CreateNN() {
    return (
        <div className="create-nn-container">
            <h1 className="H">Create Neural Network</h1>
            <NNdrawer />
        </div>
    );
}

// Keep the rest of the file the same

export default App;