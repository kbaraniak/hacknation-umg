"""
Tests for Industry Index Calculator
"""

import pytest
from classes.industry_index import (
    IndustryIndexCalculator,
    ExponentialSmoothingPredictor,
    TrendForecast,
    IndustryScore,
    IndustryClassification,
)
from classes.pkd_data_loader import FinancialMetrics


class TestExponentialSmoothingPredictor:
    """Test Exponential Smoothing Predictor"""
    
    def test_predict_growth_trend(self):
        """Test prediction with growth trend"""
        predictor = ExponentialSmoothingPredictor(alpha=0.4)
        
        # Consistent growth
        historical = [100, 110, 121, 133, 146]
        years = [2020, 2021, 2022, 2023, 2024]
        
        forecast, confidence = predictor.predict(historical, years, forecast_years=2)
        
        assert 2025 in forecast
        assert 2026 in forecast
        # Check that forecast values are positive and reasonable
        assert forecast[2025] > 0
        assert forecast[2026] > 0
        assert confidence > 0
    
    def test_predict_declining_trend(self):
        """Test prediction with declining trend"""
        predictor = ExponentialSmoothingPredictor(alpha=0.4)
        
        # Consistent decline
        historical = [150, 140, 130, 120, 110]
        years = [2020, 2021, 2022, 2023, 2024]
        
        forecast, confidence = predictor.predict(historical, years, forecast_years=2)
        
        # Check that we have forecast
        assert 2025 in forecast
        assert 2026 in forecast
        assert forecast[2025] > 0
        assert forecast[2026] > 0
        assert confidence > 0
    
    def test_predict_insufficient_data(self):
        """Test prediction with insufficient data"""
        predictor = ExponentialSmoothingPredictor()
        
        forecast, confidence = predictor.predict([100], [2024], forecast_years=2)
        
        assert len(forecast) == 0
        assert confidence == 0.0
    
    def test_confidence_calculation(self):
        """Test confidence score calculation"""
        predictor = ExponentialSmoothingPredictor()
        
        # Stable data - high confidence
        confidence_stable = predictor._calculate_confidence([100, 101, 99, 100, 102])
        
        # Volatile data - low confidence
        confidence_volatile = predictor._calculate_confidence([100, 50, 150, 25, 200])
        
        assert confidence_stable > confidence_volatile


class TestIndustryScoreCalculation:
    """Test Industry Score calculation"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.calculator = IndustryIndexCalculator()
    
    def test_size_score_calculation(self):
        """Test Size Score (0-25)"""
        financial_history = {
            2023: FinancialMetrics(year=2023, revenue=1_000_000),
            2024: FinancialMetrics(year=2024, revenue=1_200_000),
        }
        
        score = self.calculator._calculate_size_score(financial_history)
        
        assert 0 <= score <= 25
    
    def test_profitability_score_calculation(self):
        """Test Profitability Score (0-25)"""
        financial_history = {
            2023: FinancialMetrics(year=2023, revenue=1_000_000, net_income=80_000),
            2024: FinancialMetrics(year=2024, revenue=1_200_000, net_income=100_000),
        }
        
        score = self.calculator._calculate_profitability_score(
            financial_history,
            sector_avg=0.08
        )
        
        assert 0 <= score <= 25
    
    def test_growth_score_calculation(self):
        """Test Growth Score (0-25)"""
        financial_history = {
            2022: FinancialMetrics(year=2022, revenue=800_000),
            2023: FinancialMetrics(year=2023, revenue=1_000_000),
            2024: FinancialMetrics(year=2024, revenue=1_200_000),
        }
        
        score = self.calculator._calculate_growth_score(financial_history)
        
        assert 0 <= score <= 25
    
    def test_risk_score_calculation(self):
        """Test Risk Score (0-25)"""
        financial_history = {
            2023: FinancialMetrics(
                year=2023,
                revenue=1_000_000,
                net_income=80_000,
                long_term_debt=100_000,
                short_term_debt=50_000,
            ),
            2024: FinancialMetrics(
                year=2024,
                revenue=1_200_000,
                net_income=100_000,
                long_term_debt=120_000,
                short_term_debt=60_000,
            ),
        }
        bankruptcy_history = {2023: 1, 2024: 2}
        
        score = self.calculator._calculate_risk_score(
            financial_history,
            bankruptcy_history,
            total_units=100
        )
        
        assert 0 <= score <= 25
    
    def test_calculate_industry_scores_full(self):
        """Test full industry score calculation"""
        financial_history = {
            2022: FinancialMetrics(
                year=2022,
                revenue=800_000,
                net_income=64_000,
                long_term_debt=50_000,
            ),
            2023: FinancialMetrics(
                year=2023,
                revenue=1_000_000,
                net_income=80_000,
                long_term_debt=60_000,
            ),
            2024: FinancialMetrics(
                year=2024,
                revenue=1_200_000,
                net_income=100_000,
                long_term_debt=70_000,
            ),
        }
        bankruptcy_history = {2022: 0, 2023: 1, 2024: 1}
        
        scores = self.calculator.calculate_industry_scores(
            financial_history,
            bankruptcy_history
        )
        
        assert isinstance(scores, IndustryScore)
        assert 0 <= scores.size_score <= 25
        assert 0 <= scores.profitability_score <= 25
        assert 0 <= scores.growth_score <= 25
        assert 0 <= scores.risk_score <= 25
        assert 0 <= scores.overall_score <= 100


class TestIndustryClassification:
    """Test Industry Classification"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.calculator = IndustryIndexCalculator()
    
    def test_classify_healthy_industry(self):
        """Test classification of healthy growing industry"""
        financial_history = {
            2022: FinancialMetrics(year=2022, revenue=1_000_000, net_income=100_000),
            2023: FinancialMetrics(year=2023, revenue=1_200_000, net_income=120_000),
            2024: FinancialMetrics(year=2024, revenue=1_440_000, net_income=144_000),
        }
        bankruptcy_history = {2022: 0, 2023: 0, 2024: 0}
        
        scores = self.calculator.calculate_industry_scores(
            financial_history,
            bankruptcy_history
        )
        trend = self.calculator.calculate_trend_forecast(financial_history)
        
        classification = self.calculator.classify_industry(scores, trend, financial_history)
        
        assert classification.category == "ZDROWA"
        assert classification.status == "ROSNĄCA"
    
    def test_classify_declining_industry(self):
        """Test classification of declining industry"""
        financial_history = {
            2022: FinancialMetrics(year=2022, revenue=1_000_000, net_income=80_000),
            2023: FinancialMetrics(year=2023, revenue=900_000, net_income=60_000),
            2024: FinancialMetrics(year=2024, revenue=810_000, net_income=45_000),
        }
        bankruptcy_history = {2022: 1, 2023: 3, 2024: 5}
        
        scores = self.calculator.calculate_industry_scores(
            financial_history,
            bankruptcy_history,
            total_units_in_sector=100
        )
        trend = self.calculator.calculate_trend_forecast(financial_history)
        
        classification = self.calculator.classify_industry(scores, trend, financial_history)
        
        assert classification.status == "SPADAJĄCA"
    
    def test_classify_stagnant_industry(self):
        """Test classification of stagnant industry"""
        financial_history = {
            2022: FinancialMetrics(year=2022, revenue=1_000_000, net_income=60_000),
            2023: FinancialMetrics(year=2023, revenue=1_010_000, net_income=61_000),
            2024: FinancialMetrics(year=2024, revenue=995_000, net_income=59_000),
        }
        bankruptcy_history = {2022: 0, 2023: 0, 2024: 0}
        
        scores = self.calculator.calculate_industry_scores(
            financial_history,
            bankruptcy_history
        )
        trend = self.calculator.calculate_trend_forecast(financial_history)
        
        classification = self.calculator.classify_industry(scores, trend, financial_history)
        
        assert classification.status == "STAGNACJA"
    
    def test_credit_needs_estimation(self):
        """Test credit needs estimation"""
        financial_history = {
            2023: FinancialMetrics(year=2023, revenue=1_000_000),
            2024: FinancialMetrics(year=2024, revenue=1_200_000),
        }
        
        credit_high = self.calculator._estimate_credit_amount(
            financial_history,
            credit_needs="WYSOKIE",
            status="ROSNĄCA"
        )
        
        credit_low = self.calculator._estimate_credit_amount(
            financial_history,
            credit_needs="NISKIE",
            status="ROSNĄCA"
        )
        
        assert credit_high > credit_low
        assert credit_high > 0
        assert credit_low > 0


class TestTrendForecast:
    """Test Trend Forecast calculation"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.calculator = IndustryIndexCalculator()
    
    def test_calculate_trend_growth(self):
        """Test trend calculation for growing industry"""
        financial_history = {
            2020: FinancialMetrics(year=2020, revenue=800_000),
            2021: FinancialMetrics(year=2021, revenue=880_000),
            2022: FinancialMetrics(year=2022, revenue=1_000_000),
            2023: FinancialMetrics(year=2023, revenue=1_200_000),
            2024: FinancialMetrics(year=2024, revenue=1_440_000),
        }
        
        trend = self.calculator.calculate_trend_forecast(financial_history)
        
        assert isinstance(trend, TrendForecast)
        assert trend.direction == "UP"
        assert trend.yoy_growth > 0
        assert 0 <= trend.volatility <= 100
        assert 0 <= trend.confidence <= 100
        assert len(trend.forecast_values) > 0
    
    def test_calculate_trend_decline(self):
        """Test trend calculation for declining industry"""
        financial_history = {
            2020: FinancialMetrics(year=2020, revenue=1_000_000),
            2021: FinancialMetrics(year=2021, revenue=950_000),
            2022: FinancialMetrics(year=2022, revenue=900_000),
            2023: FinancialMetrics(year=2023, revenue=810_000),
            2024: FinancialMetrics(year=2024, revenue=729_000),
        }
        
        trend = self.calculator.calculate_trend_forecast(financial_history)
        
        assert trend.direction == "DOWN"
        assert trend.yoy_growth < 0
    
    def test_calculate_trend_stable(self):
        """Test trend calculation for stable industry"""
        financial_history = {
            2020: FinancialMetrics(year=2020, revenue=1_000_000),
            2021: FinancialMetrics(year=2021, revenue=1_002_000),
            2022: FinancialMetrics(year=2022, revenue=998_000),
            2023: FinancialMetrics(year=2023, revenue=1_001_000),
            2024: FinancialMetrics(year=2024, revenue=999_000),
        }
        
        trend = self.calculator.calculate_trend_forecast(financial_history)
        
        assert trend.direction == "STABLE"
        assert abs(trend.yoy_growth) < 5


class TestFullIndexCalculation:
    """Test full index calculation"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.calculator = IndustryIndexCalculator()
    
    def test_calculate_full_index(self):
        """Test full index calculation"""
        financial_history = {
            2020: FinancialMetrics(
                year=2020,
                revenue=800_000,
                net_income=64_000,
                long_term_debt=40_000,
            ),
            2021: FinancialMetrics(
                year=2021,
                revenue=900_000,
                net_income=72_000,
                long_term_debt=45_000,
            ),
            2022: FinancialMetrics(
                year=2022,
                revenue=1_000_000,
                net_income=80_000,
                long_term_debt=50_000,
            ),
            2023: FinancialMetrics(
                year=2023,
                revenue=1_100_000,
                net_income=88_000,
                long_term_debt=55_000,
            ),
            2024: FinancialMetrics(
                year=2024,
                revenue=1_200_000,
                net_income=100_000,
                long_term_debt=60_000,
            ),
        }
        bankruptcy_history = {2020: 0, 2021: 0, 2022: 1, 2023: 1, 2024: 0}
        
        full_index = self.calculator.calculate_full_index(
            financial_history,
            bankruptcy_history,
            forecast_years=3
        )
        
        assert "scores" in full_index
        assert "trend" in full_index
        assert "classification" in full_index
        
        # Check scores structure
        assert "size" in full_index["scores"]
        assert "profitability" in full_index["scores"]
        assert "growth" in full_index["scores"]
        assert "risk" in full_index["scores"]
        assert "overall" in full_index["scores"]
        
        # Check trend structure
        assert "direction" in full_index["trend"]
        assert "yoy_growth" in full_index["trend"]
        assert "volatility" in full_index["trend"]
        assert "confidence" in full_index["trend"]
        assert "forecast" in full_index["trend"]
        
        # Check classification structure
        assert "category" in full_index["classification"]
        assert "status" in full_index["classification"]
        assert "credit_needs" in full_index["classification"]
        assert "credit_amount_estimate" in full_index["classification"]
        assert "risk_level" in full_index["classification"]
        
        # Check forecast has correct number of years
        assert len(full_index["trend"]["forecast"]) == 3
    
    def test_full_index_scores_range(self):
        """Test that all scores are in valid ranges"""
        financial_history = {
            2022: FinancialMetrics(year=2022, revenue=1_000_000, net_income=80_000),
            2023: FinancialMetrics(year=2023, revenue=1_100_000, net_income=88_000),
            2024: FinancialMetrics(year=2024, revenue=1_200_000, net_income=100_000),
        }
        
        full_index = self.calculator.calculate_full_index(
            financial_history,
            {}
        )
        
        scores = full_index["scores"]
        
        # Each component should be 0-25
        assert 0 <= scores["size"] <= 25
        assert 0 <= scores["profitability"] <= 25
        assert 0 <= scores["growth"] <= 25
        assert 0 <= scores["risk"] <= 25
        
        # Overall should be 0-100
        assert 0 <= scores["overall"] <= 100
