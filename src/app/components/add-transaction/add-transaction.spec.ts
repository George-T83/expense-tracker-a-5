import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTransactionComponent } from './add-transaction';

describe('AddTransactionComponent', () => {
  let component: AddTransactionComponent;
  let fixture: ComponentFixture<AddTransactionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddTransactionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddTransactionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
