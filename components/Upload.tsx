import { CheckCircle2, ImageIcon, UploadIcon } from 'lucide-react';
import  React, { useState, useCallback, useEffect, useRef, type ChangeEvent } from 'react'
import { useOutletContext } from 'react-router';

import {  PROGRESS_INCREMENT, REDIRECT_DELAY_MS, PROGRESS_INTERVAL_MS } from "../lib/constants";
import { time } from 'console';

interface UploadProps {
  onComplete?: (base64: string) => void;
}

const Upload = ({onComplete}: UploadProps) => {

    

    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);

    const intervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to store the interval ID
    const timeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref to store the timeout ID


    const { isSignedIn } = useOutletContext<AuthContext>();

    useEffect(()=>{
        return ()=>{
            if(intervalRef.current){
                clearInterval(intervalRef.current);
                intervalRef.current = null; // Clear the interval ID
            }
            if(timeoutRef.current){
                clearTimeout(timeoutRef.current);
                timeoutRef.current= null; // Clear the timeout ID
            }
        }
    },[])

    const processFile = useCallback((file:File)=>{
        if(!isSignedIn) return;

        setFile(file);
        setProgress(0);

        const reader = new FileReader();
        reader.onerror = ()=>{
            setFile(null);
            setProgress(0)
        }

        reader.onloadend = ()=>{
            const base64Data = reader.result as string;
            
            intervalRef.current = setInterval(() => {
                setProgress((prev) => {
                    const next = prev + PROGRESS_INCREMENT;

                    if(next>=100){
                        if(intervalRef.current){
                            clearInterval(intervalRef.current);
                            intervalRef.current = null; // Clear the interval ID
                        }

                        timeoutRef.current = setTimeout(()=>{
                            onComplete?.(base64Data);
                            timeoutRef.current= null; // Clear the timeout ID
                        },REDIRECT_DELAY_MS);

                        return 100; // Ensure progress reaches exactly 100% before redirecting.
                    }
                    return next;
                });
            },PROGRESS_INTERVAL_MS)
        };
        reader.readAsDataURL(file);
        
    },[isSignedIn,onComplete]);


    const handleDragOver = (e:React.DragEvent)=>{
        e.preventDefault();
        if(!isSignedIn) return;
        setIsDragging(true);
    }

    const handleDragLeave = (e:React.DragEvent)=>{
        setIsDragging(false);
    }

    const handleDrop = (e:React.DragEvent)=>{
        e.preventDefault();
        setIsDragging(false);
        if(!isSignedIn) return;

        const droppedFile = e.dataTransfer.files[0];
        const allowedTypes = ['image/jpeg','image/png'];

        if(droppedFile && allowedTypes.includes(droppedFile.type)){
            processFile(droppedFile)
        }

    }


    const handleChange = (e:ChangeEvent<HTMLInputElement>)=>{
        if(!isSignedIn) return;
        
        const selectedFile = e.target.files?.[0];
        if(selectedFile){
            processFile(selectedFile);
        }
    }


    return (
        <div className='upload'>
            {!file ? (
                <div className={`dropzone ${isDragging ? 'is-dragging': ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                >
                    <input
                        type="file"
                         className='drop-input'
                          accept=".jpg,.jpeg,.png" 
                          disabled={!isSignedIn}
                          onChange={handleChange}
                    />

                    <div className='drop-content'>
                        <div className='drop-icon'>
                            <UploadIcon size={20}/>
                        </div>
                        <p>
                            {isSignedIn ? (
                                "Click to upload or just drag and drop"
                            ):(
                                "Sign in or Sign up with Puter to upload your file. "
                            )}
                        </p>
                        <p className='help'>Maximum file size 50MB.</p>
                    </div>
                </div>
            ):(
                <div className='upload-status'>
                    <div className='status-content'>
                        <div className='status-icon'>
                            {progress === 100 ? (
                                <CheckCircle2 className='check'/>
                            ):(
                            <ImageIcon className='image' />
                            )}
                        </div>

                        <h3>{file.name}</h3>

                        <div className='progress'>
                            <div className='bar' style={{width:`${progress}%`}}/>

                            <p className='status-text'>
                                {progress < 100 ? 'Analyzing floor plan...':'Redirecting...'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default Upload