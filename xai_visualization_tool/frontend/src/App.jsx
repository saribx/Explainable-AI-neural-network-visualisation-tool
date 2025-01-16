import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { useState } from 'react';
import './App.css';
import api from './api';
import NNdrawer from "./NNdrawer.tsx";
import ModelNetworkVisualizer from './modelNNVisualizer.tsx';

/**
 * Provides file upload functionality and visualization rendering
 */
function App() {
    const [isModelFileUploaded, setIsModelFileUploaded] = useState(false);
    const [isActFileUploaded, setIsActFileUploaded] = useState(false);
    const [file, setFile] = useState(null);
    const [Afile, setAFile] = useState(null);
    const [visualizationData, setVisualizationData] = useState(null);
    const [error, setError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState({ model: false, act: false });

    /**
     * Handles the model file input event and uploads the file
     * @param {Event} e - The file input event
     */
    async function handleModelFileInput(e) {
        const files = e.target.files;
        if (files) {
            setFile(files[0]);
            setIsModelFileUploaded(true);
            const formData = new FormData();
            formData.append('file', files[0]);
            try {
                await api.post('/upload_model/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setError(null);
                setUploadSuccess(prev => ({ ...prev, model: true }));
            } catch (err) {
                setError(`Error uploading model file: ${err.message}`);
                console.error('Model upload error:', err);
            }
        }
    }

    /**
     * Handles the activation file input event and uploads the file
     * @param {Event} e - The file input event
     */
    async function handleActFileInput(e) {
        const Afiles = e.target.files;
        if (Afiles) {
            setAFile(Afiles[0]);
            setIsActFileUploaded(true);
            const formData = new FormData();
            formData.append('file', Afiles[0]);
            try {
                await api.post('/upload_activations/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setError(null);
                setUploadSuccess(prev => ({ ...prev, act: true }));
            } catch (err) {
                setError(`Error uploading activation file: ${err.message}`);
                console.error('Activation upload error:', err);
            }
        }
    }

    /**
     * Handles the model upload button click event, triggering the file input dialog
     */
    function handleModelUploadButtonClick() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pt, .pth';
        input.onchange = handleModelFileInput;
        input.click();
    }

    /**
     * Handles the activation upload button click event, triggering the file input dialog
     */
    function handleActUploadButtonClick() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pt, .pth';
        input.onchange = handleActFileInput;
        input.click();
    }

    /**
     * Loads example files when the "Load Example Files" button is clicked
     */
    async function handleLoadExample() {
        try {
            const response = await api.get('/use_example/');
            if (response.data.message === 'Example files loaded successfully') {
                setIsModelFileUploaded(true);
                setIsActFileUploaded(true);
                setFile({ name: 'linear_correlated_model.pt' });
                setAFile({ name: 'acts_linear_correlated_model.pt' });
                setError(null);
                setUploadSuccess({ model: true, act: true });
            }
        } catch (err) {
            setError(`Error loading example files: ${err.message}`);
            console.error('Example files error:', err);
        }
    }

    /**
     * Handles the "Visualize" button click event, fetching the visualization data
     */
    async function handleVisualizeButtonClick() {
        try {
            const response = await api.get('/');
            setVisualizationData(response.data);
            setError(null);
        } catch (err) {
            setError(`Error fetching visualization data: ${err.message}`);
            console.error('Visualization error:', err);
        }
    }

    return (
        <Router>
            <nav className="navbar">
                <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/create_NN">Create NN</Link></li>
                </ul>
            </nav>

            <Routes>
                <Route path="/" element={
                    <>
                        <h1 className="H">XAI NN Visualization Tool</h1>
                        <h3>Upload your trained model and its activations to visualize your neural network</h3>

                        <div className="code-block">
                            <p>With the simple upload of your trained model and its activations saved as .pt file</p>
                            <p>you can see the activations visually with histograms inside neurons</p>
                            <p>and the edge colors show connection strength between neurons:</p>
                            <code>
                                <span style={{color: '#ff0000'}}>Red</span>: Strong positive/excitatory connection<br/>
                                <span style={{color: '#0000ff'}}>Blue</span>: Strong negative/inhibitory connection<br/>
                                <span style={{color: '#ffffff'}}>White</span>: Weak/no connection<br/>
                            </code>
                            <p></p>
                            <p>To generate the activations you can use the following code:</p>
                            <code>
                                <span className="keyword">acts</span> = <span
                                className="function">collect_activation</span>(model_linear_correlated_data,
                                model_linear_correlated_data_dict[&quot;x_train&quot;])<br/>
                                <span className="function">torch.save</span>(acts, &apos;activations.pt&apos;)
                            </code>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button onClick={handleLoadExample} className="upload-button">
                            Load Example Files
                            {uploadSuccess.model && uploadSuccess.act && (
                                <svg className="success-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            )}
                        </button>

                        <button onClick={handleModelUploadButtonClick} className="upload-button">
                            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Upload Model
                            {uploadSuccess.model && (
                                <svg className="success-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </button>
                        {isModelFileUploaded && file && (
                            <p className="upload-text">Model File Uploaded: {file.name}</p>
                        )}

                        <button onClick={handleActUploadButtonClick} className="upload-button">
                            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Upload Activations
                            {uploadSuccess.act && (
                                <svg className="success-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </button>
                        {isActFileUploaded && Afile && (
                            <p className="upload-text">Activation File Uploaded: {Afile.name}</p>
                        )}

                        <button
                            onClick={handleVisualizeButtonClick}
                            className={`upload-button ${isActFileUploaded && isModelFileUploaded ? 'activated' : 'non-activated'}`}
                            disabled={!isActFileUploaded || !isModelFileUploaded}>
                            Visualize
                        </button>

                        {visualizationData && (
                            <>
                                <div className="code-block">
                                    <pre>{JSON.stringify(visualizationData.model_structure, null, 2)}</pre>
                                </div>
                                <ModelNetworkVisualizer visualizationData={visualizationData} />
                            </>
                        )}
                    </>
                }/>

                <Route path="/create_NN" element={
                    <div className="create-nn-container">
                        <h1 className="H">Create Neural Network</h1>
                        <NNdrawer />
                    </div>
                }/>
            </Routes>
        </Router>
    );
}

export default App;
