"""
PKD Data Service Package
Pakiet do zarządzania danymi Polskiej Klasyfikacji Działalności (PKD)
"""

from classes.pkd_classification import (
    PKDVersion,
    PKDLevel,
    PKDCode,
    PKDHierarchy,
)

from classes.pkd_data_loader import (
    FinancialMetrics,
    BankruptcyData,
    PKDMapper,
    PKDDataLoader,
)

from classes.pkd_data_service import (
    IndustryData,
    PKDDataService,
)

__version__ = "1.0.0"
__all__ = [
    "PKDVersion",
    "PKDLevel",
    "PKDCode",
    "PKDHierarchy",
    "FinancialMetrics",
    "BankruptcyData",
    "PKDMapper",
    "PKDDataLoader",
    "IndustryData",
    "PKDDataService",
]
