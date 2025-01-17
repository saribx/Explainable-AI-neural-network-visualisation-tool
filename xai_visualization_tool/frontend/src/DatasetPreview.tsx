// DatasetPreview.tsx
import * as React from 'react';
import api from './api';
import './DatasetPreview.css';

interface DatasetPreviewProps {
    className?: string;
    onDatasetLoaded?: (data: number[]) => void;
}

const DatasetPreview: React.FC<DatasetPreviewProps> = ({className, onDatasetLoaded}) => {
    const [isDatasetUploaded, setIsDatasetUploaded] = React.useState(false);
    const [datasetFile, setDatasetFile] = React.useState<File | null>(null);
    const [uploadSuccess, setUploadSuccess] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [firstElement, setFirstElement] = React.useState<number[] | null>(null);

    const getColor = (value: number): string => {
        const v = Math.max(0, Math.min(1, value));

        const colors = [
            [68, 1, 84],
            [70, 50, 127],
            [59, 82, 139],
            [33, 144, 141],
            [93, 201, 99],
            [253, 231, 37]
        ];

        const numSegments = colors.length - 1;
        const segment = Math.min(Math.floor(v * numSegments), numSegments - 1);
        const segmentT = (v * numSegments) - segment;

        const c1 = colors[segment];
        const c2 = colors[segment + 1];

        const r = Math.round(c1[0] + (c2[0] - c1[0]) * segmentT);
        const g = Math.round(c1[1] + (c2[1] - c1[1]) * segmentT);
        const b = Math.round(c1[2] + (c2[2] - c1[2]) * segmentT);

        return `rgb(${r}, ${g}, ${b})`;
    };

    const reshapeToGrid = (data: number[]): number[][] => {
        if (!Array.isArray(data) || data.length !== 64) {
            console.error('Invalid data format:', data);
            return Array(8).fill(Array(8).fill(0));
        }
        const grid: number[][] = [];
        for (let i = 0; i < 8; i++) {
            grid.push(data.slice(i * 8, (i + 1) * 8));
        }
        return grid;
    };

    const handleDatasetFileInput = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            setDatasetFile(files[0]);
            setIsDatasetUploaded(true);
            const formData = new FormData();
            formData.append('file', files[0]);

            void api.post('/upload_dataset/', formData, {
                headers: {'Content-Type': 'multipart/form-data'}
            }).then((response) => {
                console.log('Dataset upload response:', response.data);
                setError(null);
                setUploadSuccess(true);
                if (response.data.first_element && Array.isArray(response.data.first_element)) {
                    setFirstElement(response.data.first_element);
                    onDatasetLoaded?.(response.data.first_element);
                } else {
                    console.error('Invalid response format:', response.data);
                    setError('Invalid data format received');
                }
            }).catch((err: Error) => {
                console.error('Dataset upload error:', err);
                setError(`Error uploading dataset file: ${err.message}`);
            });
        }
    }, [onDatasetLoaded]);

    const handleDatasetUploadButtonClick = React.useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pt, .pth';
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            if (target && target.files) {
                handleDatasetFileInput({
                    target: target,
                    currentTarget: target,
                    preventDefault: () => {
                    },
                    stopPropagation: () => {
                    },
                    isPropagationStopped: () => false,
                    isDefaultPrevented: () => false,
                    persist: () => {
                    },
                    bubbles: e.bubbles,
                    cancelable: e.cancelable,
                    defaultPrevented: e.defaultPrevented,
                    timeStamp: e.timeStamp,
                    nativeEvent: e,
                    type: e.type
                } as React.ChangeEvent<HTMLInputElement>);
            }
        });
        input.click();
    }, [handleDatasetFileInput]);

    return (
        <div className="dataset-preview-container">
            <button onClick={handleDatasetUploadButtonClick} className="upload-button">
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Upload Dataset
                {uploadSuccess && (
                    <svg className="success-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                )}
            </button>

            {isDatasetUploaded && datasetFile && (
                <p className="upload-text">Dataset File Uploaded: {datasetFile.name}</p>
            )}

            {firstElement && (
                <div className="dataset-preview">
                    <h4>First Element Preview:</h4>
                    <div className="preview-image">
                        {reshapeToGrid(firstElement).map((row, i) => (
                            <div key={i} className="image-row">
                                {row.map((value, j) => (
                                    <div
                                        key={`${i}-${j}`}
                                        className="image-pixel"
                                        style={{
                                            backgroundColor: getColor(value),
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <span style={{
                                            color: value > 0.5 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
                                            fontSize: '7px',
                                            userSelect: 'none'
                                        }}>
                                            {value.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="error-message">{error}</div>
            )}
        </div>
    );
};

export default DatasetPreview;
