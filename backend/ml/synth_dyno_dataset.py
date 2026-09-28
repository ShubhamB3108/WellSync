import sys
import os
import random
from typing import List, Tuple, Dict
import numpy as np

# Ensure app imports work
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.ingestion.simulator import generate_dyno_card_points
from app.services.dyno_classifier import extract_features, CLASSES

def generate_synthetic_dataset(samples_per_class: int = 150) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generates balanced synthetic dataset of dynamometer card features across all 5 classes.
    """
    X = []
    y = []
    
    for class_idx, class_name in enumerate(CLASSES):
        for _ in range(samples_per_class):
            stroke = 86.0 + random.uniform(-4.0, 4.0)
            pprl = 16500.0 + random.uniform(-1200.0, 1500.0)
            mprl = 4500.0 + random.uniform(-600.0, 800.0)
            
            points = generate_dyno_card_points(
                card_type=class_name,
                stroke_length_in=stroke,
                pprl_lbf=pprl,
                mprl_lbf=mprl
            )
            feats = extract_features(points)
            
            # Add small random measurement noise to engineered features
            X.append([
                feats["pprl_lbf"] + random.uniform(-50, 50),
                feats["mprl_lbf"] + random.uniform(-50, 50),
                feats["card_area"] + random.uniform(-200, 200),
                feats["downstroke_spike"] + random.uniform(-5, 5),
                feats["counterbalance_ratio"] + random.uniform(-0.01, 0.01)
            ])
            y.append(class_idx)
            
    return np.array(X), np.array(y)

if __name__ == "__main__":
    X, y = generate_synthetic_dataset(100)
    print(f"Generated synthetic dyno dataset: X shape = {X.shape}, y shape = {y.shape}")
