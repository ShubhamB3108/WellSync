import pytest
from app.ingestion.simulator import generate_dyno_card_points
from app.services.dyno_classifier import extract_features, classify_dyno_card

def test_dyno_feature_extraction():
    points = generate_dyno_card_points(
        card_type="fluid_pound",
        stroke_length_in=86.0,
        pprl_lbf=18000.0,
        mprl_lbf=4000.0
    )
    
    feats = extract_features(points)
    assert feats["pprl_lbf"] >= 17000.0
    assert feats["mprl_lbf"] <= 4500.0
    assert feats["card_area"] > 10000.0
    assert feats["downstroke_spike"] > 50.0

def test_fluid_pound_classification():
    points = generate_dyno_card_points(
        card_type="fluid_pound",
        stroke_length_in=86.0,
        pprl_lbf=18200.0,
        mprl_lbf=3800.0
    )
    pred_class, conf, _ = classify_dyno_card(points)
    assert pred_class == "fluid_pound"
    assert conf >= 0.70
