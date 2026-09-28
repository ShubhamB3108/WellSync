import json
import os
import joblib
from typing import List, Dict, Tuple, Any
import numpy as np
from app.core.config import settings

FEATURE_NAMES = ["pprl_lbf", "mprl_lbf", "card_area", "downstroke_spike", "counterbalance_ratio"]
CLASSES = ["normal", "fluid_pound", "gas_interference", "pump_off", "worn_valve"]

_model = None

def get_model():
    global _model
    if _model is None and os.path.exists(settings.DYNO_MODEL_PATH):
        try:
            _model = joblib.load(settings.DYNO_MODEL_PATH)
        except Exception as e:
            print(f"Warning: could not load dyno model from {settings.DYNO_MODEL_PATH}: {e}")
            _model = None
    return _model

def shoelace_polygon_area(points: List[Dict[str, float]]) -> float:
    """Calculates polygon area via Shoelace algorithm."""
    n = len(points)
    if n < 3:
        return 0.0
    x = [p["position_in"] for p in points]
    y = [p["load_lbf"] for p in points]
    area = 0.5 * abs(sum(x[i] * y[(i + 1) % n] - x[(i + 1) % n] * y[i] for i in range(n)))
    return float(area)

def extract_features(points: List[Dict[str, float]]) -> Dict[str, float]:
    """
    Extracts 5 engineered petroleum engineering features from dyno card points:
    - PPRL (Peak Polished Rod Load)
    - MPRL (Minimum Polished Rod Load)
    - Card Area (Work per stroke)
    - Downstroke Spike (load-derivative anomaly signaling fluid pound)
    - Counterbalance Ratio ((PPRL + MPRL) / 2 / PPRL)
    """
    if not points:
        return {
            "pprl_lbf": 0.0,
            "mprl_lbf": 0.0,
            "card_area": 0.0,
            "downstroke_spike": 0.0,
            "counterbalance_ratio": 0.5
        }
    
    loads = [p["load_lbf"] for p in points]
    positions = [p["position_in"] for p in points]
    
    pprl = float(max(loads))
    mprl = float(min(loads))
    area = shoelace_polygon_area(points)
    
    # Analyze downstroke phase (where position is decreasing)
    downstroke_diffs = []
    for i in range(len(points) - 1):
        delta_pos = positions[i + 1] - positions[i]
        if delta_pos < -0.1:  # moving downwards
            delta_load = loads[i + 1] - loads[i]
            deriv = abs(delta_load / delta_pos)
            downstroke_diffs.append(deriv)
            
    if downstroke_diffs:
        downstroke_spike = float(max(downstroke_diffs) - np.median(downstroke_diffs))
    else:
        downstroke_spike = 0.0
        
    cb_ratio = float((pprl + mprl) / (2.0 * max(1.0, pprl)))
    
    return {
        "pprl_lbf": pprl,
        "mprl_lbf": mprl,
        "card_area": area,
        "downstroke_spike": downstroke_spike,
        "counterbalance_ratio": cb_ratio
    }

def rule_based_fallback(features: Dict[str, float]) -> Tuple[str, float]:
    """
    Physically grounded rule-based diagnostic classifier matching known card shapes:
    - Fluid Pound: abrupt load drop on downstroke (high downstroke_spike > 180)
    - Pump-Off: severely collapsed card area (< 18000)
    - Gas Interference: delayed load pickup on upstroke, moderate card area
    - Worn Valve: rounded corners, reduced PPRL
    - Normal: full rectangular/parallelogram work loop
    """
    area = features["card_area"]
    spike = features["downstroke_spike"]
    pprl = features["pprl_lbf"]
    mprl = features["mprl_lbf"]
    
    if spike > 220.0:
        conf = min(0.96, 0.82 + (spike - 220.0) / 1000.0)
        return "fluid_pound", round(conf, 2)
    elif area < 20000.0 and pprl > 5000:
        conf = min(0.95, 0.85 + (20000.0 - area) / 40000.0)
        return "pump_off", round(conf, 2)
    elif area < 35000.0 and (pprl - mprl) < 9000:
        return "worn_valve", 0.78
    elif area < 40000.0 and spike > 120.0:
        return "gas_interference", 0.75
    else:
        return "normal", 0.92

def classify_dyno_card(points: List[Dict[str, float]]) -> Tuple[str, float, Dict[str, float]]:
    """
    Diagnoses card condition using XGBoost/scikit model if present, otherwise fallback.
    Returns: (class_name, confidence, features_dict)
    """
    features = extract_features(points)
    model = get_model()
    
    if model is not None:
        try:
            X = np.array([[
                features["pprl_lbf"],
                features["mprl_lbf"],
                features["card_area"],
                features["downstroke_spike"],
                features["counterbalance_ratio"]
            ]])
            probs = model.predict_proba(X)[0]
            top_idx = int(np.argmax(probs))
            conf = float(probs[top_idx])
            pred_class = CLASSES[top_idx] if top_idx < len(CLASSES) else "normal"
            if conf < 0.60:
                return "uncertain", conf, features
            return pred_class, round(conf, 2), features
        except Exception as e:
            print(f"Model prediction error: {e}")
            
    # Fallback to rule-based classifier
    pred_class, conf = rule_based_fallback(features)
    return pred_class, conf, features
