"""Calculator service for scientific, financial, and unit calculations."""

import math
import re
from typing import Any

from app.core.exceptions import BadRequestError
from app.schemas.tools import (
    CalculatorOperation,
    CalculatorRequest,
    CalculatorResponse,
    UnitCategory,
)


class CalculatorService:
    """Service for calculator operations."""

    # Unit conversion tables
    UNITS = {
        UnitCategory.LENGTH: {
            "meter": 1,
            "kilometer": 1000,
            "centimeter": 0.01,
            "millimeter": 0.001,
            "mile": 1609.344,
            "yard": 0.9144,
            "foot": 0.3048,
            "inch": 0.0254,
            "nautical_mile": 1852,
        },
        UnitCategory.WEIGHT: {
            "kilogram": 1,
            "gram": 0.001,
            "milligram": 0.000001,
            "pound": 0.453592,
            "ounce": 0.0283495,
            "ton": 1000,
            "stone": 6.35029,
        },
        UnitCategory.TEMPERATURE: {
            # Special handling - not multiplicative
            "celsius": "C",
            "fahrenheit": "F",
            "kelvin": "K",
        },
        UnitCategory.AREA: {
            "square_meter": 1,
            "square_kilometer": 1000000,
            "square_mile": 2589988.11,
            "square_yard": 0.836127,
            "square_foot": 0.092903,
            "acre": 4046.86,
            "hectare": 10000,
        },
        UnitCategory.VOLUME: {
            "liter": 1,
            "milliliter": 0.001,
            "cubic_meter": 1000,
            "gallon_us": 3.78541,
            "gallon_uk": 4.54609,
            "quart": 0.946353,
            "pint": 0.473176,
            "cup": 0.24,
            "fluid_ounce": 0.0295735,
        },
        UnitCategory.SPEED: {
            "meter_per_second": 1,
            "kilometer_per_hour": 0.277778,
            "mile_per_hour": 0.44704,
            "knot": 0.514444,
            "foot_per_second": 0.3048,
        },
        UnitCategory.TIME: {
            "second": 1,
            "minute": 60,
            "hour": 3600,
            "day": 86400,
            "week": 604800,
            "month": 2629746,  # Average
            "year": 31556952,  # Average
        },
        UnitCategory.DATA: {
            "byte": 1,
            "kilobyte": 1024,
            "megabyte": 1048576,
            "gigabyte": 1073741824,
            "terabyte": 1099511627776,
            "bit": 0.125,
            "kilobit": 128,
            "megabit": 131072,
            "gigabit": 134217728,
        },
    }

    # Safe math functions for expression evaluation
    SAFE_FUNCTIONS = {
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "asin": math.asin,
        "acos": math.acos,
        "atan": math.atan,
        "sinh": math.sinh,
        "cosh": math.cosh,
        "tanh": math.tanh,
        "sqrt": math.sqrt,
        "log": math.log,
        "log10": math.log10,
        "log2": math.log2,
        "exp": math.exp,
        "pow": pow,
        "abs": abs,
        "floor": math.floor,
        "ceil": math.ceil,
        "round": round,
        "factorial": math.factorial,
        "pi": math.pi,
        "e": math.e,
        "rad": math.radians,
        "deg": math.degrees,
    }

    def calculate(self, data: CalculatorRequest) -> CalculatorResponse:
        """Perform calculation based on operation type."""
        if data.operation == CalculatorOperation.EVALUATE:
            return self._evaluate_expression(data.expression)
        elif data.operation == CalculatorOperation.LOAN_EMI:
            return self._calculate_loan_emi(
                data.principal, data.annual_rate, data.tenure_months
            )
        elif data.operation == CalculatorOperation.LOAN_TOTAL:
            return self._calculate_loan_total(
                data.principal, data.annual_rate, data.tenure_months
            )
        elif data.operation == CalculatorOperation.COMPOUND_INTEREST:
            return self._calculate_compound_interest(
                data.principal,
                data.annual_rate,
                data.years,
                data.compounds_per_year,
            )
        elif data.operation == CalculatorOperation.UNIT_CONVERT:
            return self._convert_units(
                data.value,
                data.unit_category,
                data.from_unit,
                data.to_unit,
            )
        else:
            raise BadRequestError(message="Invalid operation")

    def _evaluate_expression(self, expression: str) -> CalculatorResponse:
        """Safely evaluate a mathematical expression."""
        if not expression:
            raise BadRequestError(message="Expression is required")

        # Clean expression
        expr = expression.strip()

        # Validate expression - only allow safe characters
        if not re.match(r"^[\d\s\+\-\*\/\.\(\)\,\^a-zA-Z]+$", expr):
            raise BadRequestError(message="Invalid characters in expression")

        # Replace ^ with ** for exponentiation
        expr = expr.replace("^", "**")

        try:
            # Create safe namespace
            namespace = {"__builtins__": {}}
            namespace.update(self.SAFE_FUNCTIONS)

            # Evaluate
            result = eval(expr, namespace)

            # Format result
            if isinstance(result, float):
                if result.is_integer():
                    formatted = str(int(result))
                else:
                    formatted = f"{result:.10g}"
            else:
                formatted = str(result)

            return CalculatorResponse(
                operation=CalculatorOperation.EVALUATE,
                result=float(result),
                formatted_result=formatted,
            )
        except Exception as e:
            raise BadRequestError(message=f"Invalid expression: {str(e)}")

    def _calculate_loan_emi(
        self,
        principal: float,
        annual_rate: float,
        tenure_months: int,
    ) -> CalculatorResponse:
        """Calculate EMI (Equated Monthly Installment)."""
        if not all([principal, annual_rate is not None, tenure_months]):
            raise BadRequestError(
                message="Principal, annual rate, and tenure are required"
            )

        # Monthly interest rate
        monthly_rate = annual_rate / 100 / 12

        if monthly_rate == 0:
            emi = principal / tenure_months
        else:
            # EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
            emi = (
                principal
                * monthly_rate
                * math.pow(1 + monthly_rate, tenure_months)
                / (math.pow(1 + monthly_rate, tenure_months) - 1)
            )

        total_payment = emi * tenure_months
        total_interest = total_payment - principal

        return CalculatorResponse(
            operation=CalculatorOperation.LOAN_EMI,
            result=round(emi, 2),
            formatted_result=f"{emi:,.2f}",
            breakdown={
                "emi": round(emi, 2),
                "total_payment": round(total_payment, 2),
                "total_interest": round(total_interest, 2),
                "principal": principal,
                "annual_rate": annual_rate,
                "tenure_months": tenure_months,
            },
        )

    def _calculate_loan_total(
        self,
        principal: float,
        annual_rate: float,
        tenure_months: int,
    ) -> CalculatorResponse:
        """Calculate total loan repayment amount."""
        emi_result = self._calculate_loan_emi(principal, annual_rate, tenure_months)
        emi = emi_result.breakdown["emi"]
        total = emi * tenure_months

        return CalculatorResponse(
            operation=CalculatorOperation.LOAN_TOTAL,
            result=round(total, 2),
            formatted_result=f"{total:,.2f}",
            breakdown=emi_result.breakdown,
        )

    def _calculate_compound_interest(
        self,
        principal: float,
        annual_rate: float,
        years: float,
        compounds_per_year: int,
    ) -> CalculatorResponse:
        """Calculate compound interest."""
        if not all([principal, annual_rate is not None, years]):
            raise BadRequestError(
                message="Principal, annual rate, and years are required"
            )

        # A = P(1 + r/n)^(nt)
        rate = annual_rate / 100
        amount = principal * math.pow(
            1 + rate / compounds_per_year,
            compounds_per_year * years,
        )
        interest = amount - principal

        return CalculatorResponse(
            operation=CalculatorOperation.COMPOUND_INTEREST,
            result=round(amount, 2),
            formatted_result=f"{amount:,.2f}",
            breakdown={
                "final_amount": round(amount, 2),
                "interest_earned": round(interest, 2),
                "principal": principal,
                "annual_rate": annual_rate,
                "years": years,
                "compounds_per_year": compounds_per_year,
            },
        )

    def _convert_units(
        self,
        value: float,
        category: UnitCategory,
        from_unit: str,
        to_unit: str,
    ) -> CalculatorResponse:
        """Convert between units."""
        if not all([value is not None, category, from_unit, to_unit]):
            raise BadRequestError(
                message="Value, category, from_unit, and to_unit are required"
            )

        if category not in self.UNITS:
            raise BadRequestError(message=f"Invalid category: {category}")

        units = self.UNITS[category]

        from_unit = from_unit.lower().replace(" ", "_")
        to_unit = to_unit.lower().replace(" ", "_")

        if from_unit not in units or to_unit not in units:
            raise BadRequestError(message="Invalid unit")

        # Special handling for temperature
        if category == UnitCategory.TEMPERATURE:
            result = self._convert_temperature(value, from_unit, to_unit)
        else:
            # Convert to base unit, then to target unit
            base_value = value * units[from_unit]
            result = base_value / units[to_unit]

        return CalculatorResponse(
            operation=CalculatorOperation.UNIT_CONVERT,
            result=result,
            formatted_result=f"{result:,.6g} {to_unit}",
            breakdown={
                "from_value": value,
                "from_unit": from_unit,
                "to_value": result,
                "to_unit": to_unit,
                "category": category.value,
            },
        )

    def _convert_temperature(
        self, value: float, from_unit: str, to_unit: str
    ) -> float:
        """Convert temperature between Celsius, Fahrenheit, and Kelvin."""
        # Convert to Celsius first
        if from_unit == "celsius":
            celsius = value
        elif from_unit == "fahrenheit":
            celsius = (value - 32) * 5 / 9
        elif from_unit == "kelvin":
            celsius = value - 273.15
        else:
            raise BadRequestError(message="Invalid temperature unit")

        # Convert from Celsius to target
        if to_unit == "celsius":
            return celsius
        elif to_unit == "fahrenheit":
            return celsius * 9 / 5 + 32
        elif to_unit == "kelvin":
            return celsius + 273.15
        else:
            raise BadRequestError(message="Invalid temperature unit")

    def get_unit_categories(self) -> dict[str, Any]:
        """Get all unit categories and their units."""
        result = {}
        for category, units in self.UNITS.items():
            result[category.value] = list(units.keys())
        return result
